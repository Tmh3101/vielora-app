import type { ServiceClient } from "@/lib/services/types";
import { ETransactionType } from "@/types";
import { sendLowCreditsWarningEmail, getUserEmailById } from "@/lib/services/email.service";

const MAX_DEDUCTION_RETRIES = 3;

export interface CreditDeductionResult {
  success: boolean;
  message?: string;
  deductedFromSubscription?: number;
  deductedFromPayg?: number;
}

export interface DeductCreditsParams {
  userId: string;
  creditAmount: number;
  transactionType: ETransactionType;
  transactionDescription: string;
}

/**
 * Trừ credits từ wallet của user với optimistic locking và retry.
 *
 * Flow:
 * 1. Kiểm tra total_credits đủ không
 * 2. Kiểm tra subscription_credits đủ hoặc is_payg_enabled
 * 3. Ưu tiên trừ từ subscription_credits trước, còn thiếu trừ từ payg_credits
 * 4. Sử dụng optimistic locking để tránh race condition
 * 5. Ghi credit_transaction record
 *
 * @returns CreditDeductionResult với số credits đã trừ từ mỗi nguồn
 */
export async function deductCredits(
  client: ServiceClient,
  params: DeductCreditsParams
): Promise<CreditDeductionResult> {
  const { userId, creditAmount, transactionType, transactionDescription } = params;

  if (creditAmount <= 0) {
    return { success: true, deductedFromSubscription: 0, deductedFromPayg: 0 };
  }

  for (let attempt = 1; attempt <= MAX_DEDUCTION_RETRIES; attempt += 1) {
    // Fetch current wallet state
    const { data: wallet, error: walletError } = await client
      .from("wallets")
      .select("subscription_credits,payg_credits,total_credits,is_payg_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletError) {
      return { success: false, message: walletError.message };
    }

    if (!wallet) {
      return { success: false, message: "Wallet not found" };
    }

    // Check if total credits are sufficient
    if (wallet.total_credits < creditAmount) {
      return { success: false, message: "Insufficient credits." };
    }

    // Calculate deduction split
    const deductedFromSubscription = Math.min(wallet.subscription_credits, creditAmount);
    const deductedFromPayg = creditAmount - deductedFromSubscription;
    const nextSubscriptionCredits = wallet.subscription_credits - deductedFromSubscription;
    const nextPaygCredits = wallet.payg_credits - deductedFromPayg;

    // Optimistic locking update
    const { data: updatedWallet, error: updateWalletError } = await client
      .from("wallets")
      .update({
        subscription_credits: nextSubscriptionCredits,
        payg_credits: nextPaygCredits,
      })
      .eq("user_id", userId)
      .eq("subscription_credits", wallet.subscription_credits)
      .eq("payg_credits", wallet.payg_credits)
      .select("user_id")
      .maybeSingle();

    if (updateWalletError) {
      return { success: false, message: updateWalletError.message };
    }

    // If no row was updated, another transaction modified the wallet - retry
    if (!updatedWallet) {
      if (attempt === MAX_DEDUCTION_RETRIES) {
        return { success: false, message: "Unable to deduct credits. Please try again." };
      }
      continue;
    }

    // Insert credit transaction record
    const { error: transactionError } = await client.from("credit_transactions").insert({
      user_id: userId,
      amount: -creditAmount,
      transaction_type: transactionType,
      description: transactionDescription,
    });

    if (transactionError) {
      console.error("Critical: deducted credits but failed to insert credit transaction", {
        userId,
        creditAmount,
        transactionType,
        error: transactionError.message,
      });
      return { success: false, message: transactionError.message };
    }

    // Check and trigger low credits warning
    try {
      const { data: sub } = await client
        .from("subscriptions")
        .select("plans!inner(monthly_credits)")
        .eq("user_id", userId)
        .maybeSingle();

      const plansData = sub?.plans as unknown as { monthly_credits: number } | null | undefined;
      const monthlyCredits = plansData?.monthly_credits || 0;
      const currentTotal = nextSubscriptionCredits + nextPaygCredits;

      if (monthlyCredits > 0) {
        await checkAndSendLowCreditsWarning(
          client,
          userId,
          wallet.total_credits,
          currentTotal,
          monthlyCredits
        );
      }
    } catch (err) {
      console.error("Failed to process low credits warning:", err);
    }

    return {
      success: true,
      deductedFromSubscription,
      deductedFromPayg,
    };
  }

  return { success: false, message: "Unable to deduct credits. Please try again." };
}

/**
 * Check and send low credits warning if credits drop below 10% threshold.
 * Only triggers when crossing the threshold (previous > 10%, current <= 10%).
 */
export async function checkAndSendLowCreditsWarning(
  client: ServiceClient,
  userId: string,
  previousTotal: number,
  currentTotal: number,
  monthlyCredits: number
): Promise<void> {
  if (monthlyCredits <= 0) return;

  const threshold = Math.ceil(monthlyCredits * 0.1);
  const wasAbove = previousTotal > threshold;
  const isBelow = currentTotal <= threshold;

  // Only send when crossing the threshold
  if (!wasAbove || !isBelow) return;

  const userInfo = await getUserEmailById(client, userId);
  if (!userInfo) return;

  const usagePercent = Math.min(
    100,
    Math.round(((monthlyCredits - currentTotal) / monthlyCredits) * 100)
  );

  // Fetch next reset date
  const { data: sub } = await client
    .from("subscriptions")
    .select("next_credit_reset_at")
    .eq("user_id", userId)
    .maybeSingle();

  const nextResetDate = sub?.next_credit_reset_at
    ? new Date(sub.next_credit_reset_at).toLocaleDateString("vi-VN")
    : "N/A";

  await sendLowCreditsWarningEmail(userInfo.email, userInfo.fullName, {
    remainingCredits: currentTotal,
    totalMonthlyCredits: monthlyCredits,
    usagePercent,
    nextResetDate,
  });
}

export interface RefundCreditsParams {
  userId: string;
  deductedFromSubscription: number;
  deductedFromPayg: number;
  transactionType: ETransactionType;
  transactionDescription: string;
}

/**
 * Hoàn trả credits cho user khi có lỗi xảy ra sau khi đã trừ credits.
 */
export async function refundCredits(
  client: ServiceClient,
  params: RefundCreditsParams
): Promise<void> {
  const {
    userId,
    deductedFromSubscription,
    deductedFromPayg,
    transactionType,
    transactionDescription,
  } = params;

  const refundAmount = deductedFromSubscription + deductedFromPayg;
  if (refundAmount <= 0) return;

  try {
    const { data: wallet } = await client
      .from("wallets")
      .select("subscription_credits,payg_credits")
      .eq("user_id", userId)
      .maybeSingle();

    if (wallet) {
      await client
        .from("wallets")
        .update({
          subscription_credits: wallet.subscription_credits + deductedFromSubscription,
          payg_credits: wallet.payg_credits + deductedFromPayg,
        })
        .eq("user_id", userId);
    }

    await client.from("credit_transactions").insert({
      user_id: userId,
      amount: refundAmount,
      transaction_type: transactionType,
      description: transactionDescription,
    });
  } catch (error) {
    console.error("Failed to refund credits:", {
      userId,
      refundAmount,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export interface CreditSummary {
  /** Tổng credits được cấp trong tháng (từ plan) */
  totalCreditsThisMonth: number;
  /** Tổng credits đã sử dụng trong tháng (index + nhắn tin) */
  creditsUsedThisMonth: number;
  /** Credits đã sử dụng cho việc index trang trong tháng */
  indexCreditsUsedThisMonth: number;
  /** Credits đã sử dụng cho nhắn tin trong tháng */
  messageCreditsUsedThisMonth: number;
  /** Credits subscription còn lại trong wallet */
  subscriptionCredits: number;
  /** Credits PAYG còn lại trong wallet */
  paygCredits: number;
  /** Tổng credits còn lại (subscription + payg) */
  totalRemainingCredits: number;
  /** Phần trăm credits đã sử dụng (0–100) */
  usagePercent: number;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const dayOfMonth = result.getDate();
  result.setMonth(result.getMonth() + months);
  // If the day of the month changed, it means we overflowed (e.g., Jan 31 -> March 3).
  // Setting the date to 0 moves it to the last day of the intended month.
  if (result.getDate() !== dayOfMonth) {
    result.setDate(0);
  }
  return result;
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

interface CreditUsageWindowParams {
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextCreditResetAt: string;
}

function getCreditUsageWindow(
  params: CreditUsageWindowParams,
  now = new Date()
): { startIso: string; endIso: string } {
  const periodStart = new Date(params.currentPeriodStart);
  const periodEnd = new Date(params.currentPeriodEnd);
  const nextCreditResetAt = new Date(params.nextCreditResetAt);

  let windowEnd = isValidDate(nextCreditResetAt)
    ? nextCreditResetAt
    : addMonths(isValidDate(periodStart) ? periodStart : now, 1);

  if (isValidDate(periodEnd) && windowEnd > periodEnd) {
    windowEnd = periodEnd;
  }

  while (windowEnd <= now && (!isValidDate(periodEnd) || windowEnd < periodEnd)) {
    const nextWindowEnd = addMonths(windowEnd, 1);

    if (nextWindowEnd <= windowEnd) {
      break;
    }

    windowEnd = isValidDate(periodEnd) && nextWindowEnd > periodEnd ? periodEnd : nextWindowEnd;
  }

  let windowStart = addMonths(windowEnd, -1);

  if (isValidDate(periodStart) && windowStart < periodStart) {
    windowStart = periodStart;
  }

  return {
    startIso: windowStart.toISOString(),
    endIso: windowEnd.toISOString(),
  };
}

/**
 * Lấy thông tin tổng hợp về credits của user trong tháng hiện tại.
 *
 * Thời gian tính toán: dựa theo cửa sổ reset credit tháng hiện tại.
 * Với gói yearly, billing period kéo dài một năm nhưng credit vẫn reset theo tháng.
 *
 * @param userId - UUID của user cần truy vấn
 * @returns CreditSummary hoặc null nếu không tìm thấy subscription/wallet
 */
export async function getCreditSummary(
  client: ServiceClient,
  userId: string
): Promise<CreditSummary | null> {
  // 1. Lấy subscription + plan
  const { data: subscription, error: subError } = await client
    .from("subscriptions")
    .select("current_period_start, current_period_end, next_credit_reset_at, plan_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (subError) {
    throw new Error(`Failed to fetch subscription: ${subError.message}`);
  }

  if (!subscription?.plan_id) {
    return null;
  }

  const { data: plan, error: planError } = await client
    .from("plans")
    .select("monthly_credits")
    .eq("id", subscription.plan_id)
    .maybeSingle();

  if (planError) {
    throw new Error(`Failed to fetch plan: ${planError.message}`);
  }

  const totalCreditsThisMonth = plan?.monthly_credits ?? 0;
  const creditWindow = getCreditUsageWindow({
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    nextCreditResetAt: subscription.next_credit_reset_at,
  });

  // 2. Lấy tất cả credit transactions liên quan đến usage trong kỳ
  const indexCategoryTypes = [
    ETransactionType.IndexPages,
    ETransactionType.IndexPagesRefund,
    ETransactionType.AddKnowledge,
    ETransactionType.AddKnowledgeRefund,
    ETransactionType.UpdateKnowledge,
    ETransactionType.UpdateKnowledgeRefund,
  ];

  const chatCategoryTypes = [ETransactionType.ChatMessage, ETransactionType.ChatMessageRefund];

  const relevantTypes = [...indexCategoryTypes, ...chatCategoryTypes];

  const { data: transactions, error: txError } = await client
    .from("credit_transactions")
    .select("amount, transaction_type")
    .eq("user_id", userId)
    .in("transaction_type", relevantTypes)
    .gte("created_at", creditWindow.startIso)
    .lt("created_at", creditWindow.endIso);

  if (txError) {
    throw new Error(`Failed to fetch credit transactions: ${txError.message}`);
  }

  // 3. Phân loại và tính toán credits đã dùng
  let indexCreditsNet = 0;
  let chatCreditsNet = 0;

  (transactions ?? []).forEach((tx) => {
    if (indexCategoryTypes.includes(tx.transaction_type as ETransactionType)) {
      indexCreditsNet += tx.amount;
    } else if (chatCategoryTypes.includes(tx.transaction_type as ETransactionType)) {
      chatCreditsNet += tx.amount;
    }
  });

  // amount là số âm khi trừ credits, nên dùng - để ra số dương đã sử dụng
  const indexCreditsUsedThisMonth = Math.max(0, -indexCreditsNet);
  const messageCreditsUsedThisMonth = Math.max(0, -chatCreditsNet);
  const creditsUsedThisMonth = indexCreditsUsedThisMonth + messageCreditsUsedThisMonth;

  // 4. Lấy thông tin wallet (credits còn lại)
  const { data: wallet, error: walletError } = await client
    .from("wallets")
    .select("subscription_credits, payg_credits, total_credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (walletError) {
    throw new Error(`Failed to fetch wallet: ${walletError.message}`);
  }

  const subscriptionCredits = wallet?.subscription_credits ?? 0;
  const paygCredits = wallet?.payg_credits ?? 0;
  const totalRemainingCredits = wallet?.total_credits ?? subscriptionCredits + paygCredits;

  const usagePercent =
    totalCreditsThisMonth > 0
      ? Math.min(100, Math.round((creditsUsedThisMonth / totalCreditsThisMonth) * 100))
      : 0;

  return {
    totalCreditsThisMonth,
    creditsUsedThisMonth,
    indexCreditsUsedThisMonth,
    messageCreditsUsedThisMonth,
    subscriptionCredits,
    paygCredits,
    totalRemainingCredits,
    usagePercent,
  };
}
