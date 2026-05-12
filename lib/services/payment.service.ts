import type { ServiceClient } from "@/lib/services/types";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import {
  ESubscriptionCycle,
  EPaymentStatus,
  EPaymentType,
  ESubscriptionStatus,
  EPaymentCurrency,
} from "@/types/enums";
import {
  sendPaymentConfirmationEmail,
  sendPAYGPurchaseEmail,
  getUserEmailById,
} from "@/lib/services/email.service";
import { PaymentAction } from "@/lib/constants/payment";

export type PaymentRow = Tables<"payments">;

type ServiceResult = { success: boolean; message?: string };

// credit_transactions extended with payment_id (requires DB column)
type CreditTransactionInsert = TablesInsert<"credit_transactions"> & { payment_id: string };

function parseCycleFromMetadata(metadata: Json | null): ESubscriptionCycle {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    throw new Error("Invalid payment metadata");
  }

  const cycle = (metadata as Record<string, unknown>).cycle;

  if (cycle !== ESubscriptionCycle.Monthly && cycle !== ESubscriptionCycle.Yearly) {
    throw new Error("Invalid billing cycle in payment metadata");
  }

  return cycle as ESubscriptionCycle;
}

export async function handlePaymentSuccess(
  client: ServiceClient,
  paymentId: string
): Promise<ServiceResult> {
  const { data: payment, error: paymentError } = await client
    .from("payments")
    .select("id, user_id, amount, status, payment_type, metadata, plan_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError) {
    throw new Error(`Failed to fetch payment: ${paymentError.message}`);
  }

  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  if (payment.status === EPaymentStatus.Completed) {
    return { success: true, message: "Already processed" };
  }

  // Khóa Atomic (Pessimistic Lock giả lập):
  // Cập nhật trạng thái payment sang Completed ngay lập tức kèm theo điều kiện status = Pending.
  // Nếu Webhook và Redirect chạy cùng lúc, chỉ có 1 request cập nhật thành công và nhận được data.
  // Request còn lại sẽ nhận về null và thoát sớm.
  const { data: lockedPayment, error: lockError } = await client
    .from("payments")
    .update({ status: EPaymentStatus.Completed })
    .eq("id", paymentId)
    .eq("status", EPaymentStatus.Pending)
    .select("id")
    .maybeSingle();

  if (lockError) {
    throw new Error(`Failed to lock payment: ${lockError.message}`);
  }

  // Nếu không trả về dòng nào, nghĩa là một process khác đã cập nhật payment này thành công trước đó vài mili-giây.
  if (!lockedPayment) {
    console.log(`[Payment Lock] Payment ${paymentId} already processed by another thread.`);
    return { success: true, message: "Already processed by another thread" };
  }

  if (payment.payment_type === EPaymentType.PayAsYouGo) {
    const metadata = payment.metadata as Record<string, unknown>;
    const creditsAdded = metadata?.credits ? Number(metadata.credits) : 0;
    const packageName = (metadata?.packageName as string) || "Gói Nạp Lẻ";

    if (creditsAdded <= 0) {
      throw new Error(`Invalid credits amount in payment metadata`);
    }

    // Fetch wallet
    const { data: wallet, error: walletError } = await client
      .from("wallets")
      .select("payg_credits, total_credits")
      .eq("user_id", payment.user_id)
      .maybeSingle();

    if (walletError) throw new Error(`Failed to fetch wallet: ${walletError.message}`);
    if (!wallet) throw new Error(`Wallet not found for user ${payment.user_id}`);

    const newPaygCredits = wallet.payg_credits + creditsAdded;

    // Update wallet
    const { error: updateWalletError } = await client
      .from("wallets")
      .update({ payg_credits: newPaygCredits })
      .eq("user_id", payment.user_id);

    if (updateWalletError) {
      throw new Error(`Failed to update wallet credits: ${updateWalletError.message}`);
    }

    // Insert transaction
    const transaction: CreditTransactionInsert = {
      user_id: payment.user_id,
      payment_id: payment.id,
      amount: creditsAdded,
      transaction_type: "payg_purchase",
      description: `Nạp ${creditsAdded} credits`,
    };

    const { error: transactionError } = await client
      .from("credit_transactions")
      .insert(transaction);

    if (transactionError) {
      throw new Error(`Failed to insert credit transaction: ${transactionError.message}`);
    }

    // Send email
    const userInfo = await getUserEmailById(client, payment.user_id);
    if (userInfo) {
      await sendPAYGPurchaseEmail(userInfo.email, userInfo.fullName, {
        packageName,
        amount: payment.amount as number,
        currency: (metadata?.currency as string) ?? EPaymentCurrency.VND,
        txnId: payment.id.slice(0, 8).toUpperCase(),
        creditsAdded,
        newTotalCredits: (wallet.total_credits || 0) + creditsAdded,
      });
    }

    return { success: true, message: "PAYG processed successfully" };
  }

  if (!payment.plan_id) {
    throw new Error("Payment record is missing plan_id");
  }

  const cycle = parseCycleFromMetadata(payment.metadata);

  const { data: plan, error: planError } = await client
    .from("plans")
    .select("id, name, monthly_credits")
    .eq("id", payment.plan_id)
    .maybeSingle();

  if (planError) {
    throw new Error(`Failed to fetch plan: ${planError.message}`);
  }

  if (!plan) {
    throw new Error(`Plan ${payment.plan_id} not found`);
  }

  const metadataObj =
    typeof payment.metadata === "string" ? JSON.parse(payment.metadata) : payment.metadata;
  const metadataAction = (metadataObj as Record<string, unknown>)?.action;
  const action =
    payment.payment_type === EPaymentType.SubscriptionRenew ||
    metadataAction === PaymentAction.Renew
      ? PaymentAction.Renew
      : PaymentAction.Upgrade;

  const { data: subscription, error: subscriptionError } = await client
    .from("subscriptions")
    .select("id, current_period_start, current_period_end")
    .eq("user_id", payment.user_id)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(`Failed to fetch subscription: ${subscriptionError.message}`);
  }

  if (!subscription) {
    throw new Error(`Subscription not found for user ${payment.user_id}`);
  }

  let periodStartDate: Date;
  let periodEndDate: Date;
  let nextCreditResetAt: Date | undefined = undefined;
  let shouldResetCredits = false;

  if (action === PaymentAction.Renew) {
    // Gia hạn: Cộng dồn thời gian từ ngày kết thúc cũ
    periodStartDate = new Date(subscription.current_period_start);
    periodEndDate = new Date(subscription.current_period_end);

    // Nếu đã hết hạn từ lâu thì tính từ hôm nay và reset credit
    if (periodEndDate < new Date()) {
      periodStartDate = new Date();
      periodEndDate = new Date();
      nextCreditResetAt = new Date();
      shouldResetCredits = true;
    }
  } else {
    // Nâng cấp: Ghi đè bắt đầu từ hôm nay và reset credit
    periodStartDate = new Date();
    periodEndDate = new Date();
    nextCreditResetAt = new Date(); // Sẽ cộng thêm 1 tháng cho lần reset credit tiếp theo
    shouldResetCredits = true;
  }

  if (cycle === ESubscriptionCycle.Monthly) {
    periodEndDate.setMonth(periodEndDate.getMonth() + 1);
  } else {
    periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
  }

  const periodStartIso = periodStartDate.toISOString();
  const periodEndIso = periodEndDate.toISOString();

  if (nextCreditResetAt) {
    if (cycle === ESubscriptionCycle.Monthly) {
      nextCreditResetAt.setMonth(nextCreditResetAt.getMonth() + 1);
    } else {
      // Gói năm nhưng credit vẫn reset theo tháng
      nextCreditResetAt.setMonth(nextCreditResetAt.getMonth() + 1);
    }
  }

  // Bắt đầu cập nhật thông tin
  const updatePayload: TablesUpdate<"subscriptions"> = {
    status: ESubscriptionStatus.Active,
    plan_id: plan.id,
    billing_cycle: cycle,
    current_period_start: periodStartIso,
    current_period_end: periodEndIso,
  };

  if (nextCreditResetAt) {
    updatePayload.next_credit_reset_at = nextCreditResetAt.toISOString();
  }

  const { error: subscriptionUpdateError } = await client
    .from("subscriptions")
    .update(updatePayload)
    .eq("id", subscription.id);

  if (subscriptionUpdateError) {
    throw new Error(`Failed to update subscription: ${subscriptionUpdateError.message}`);
  }

  // Chỉ reset credit nếu là upgrade hoặc renew gói đã hết hạn
  if (shouldResetCredits) {
    const { error: walletError } = await client
      .from("wallets")
      .update({ subscription_credits: plan.monthly_credits })
      .eq("user_id", payment.user_id);

    if (walletError) {
      // Revert is ideally done with transactions, but since we use REST, we just throw error here
      throw new Error(`Failed to update wallet credits: ${walletError.message}`);
    }
  }

  const transaction: CreditTransactionInsert = {
    user_id: payment.user_id,
    payment_id: payment.id,
    amount: plan.monthly_credits,
    transaction_type: "subscription_renewal",
    description:
      action === PaymentAction.Renew
        ? `Gia hạn gói ${plan.name} chu kỳ ${cycle}`
        : `Nâng cấp gói ${plan.name} chu kỳ ${cycle}`,
  };

  const { error: transactionError } = await client.from("credit_transactions").insert(transaction);

  if (transactionError) {
    throw new Error(`Failed to insert credit transaction: ${transactionError.message}`);
  }

  // Send payment confirmation email (non-blocking)
  const userInfo = await getUserEmailById(client, payment.user_id);
  if (userInfo) {
    const formatDate = (iso: string) =>
      new Date(iso).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

    await sendPaymentConfirmationEmail(userInfo.email, userInfo.fullName, {
      planName: plan.name,
      billingCycle: cycle,
      amount: payment.amount as number,
      currency:
        ((payment.metadata as Record<string, unknown>)?.currency as string) ?? EPaymentCurrency.VND,
      txnId: payment.id.slice(0, 8).toUpperCase(),
      botsLimit: 0, // Will be resolved from plan
      monthlyCredits: plan.monthly_credits,
      periodStart: formatDate(periodStartIso),
      periodEnd: formatDate(periodEndIso),
    });
  }

  return { success: true, message: "Payment processed successfully" };
}

// ============================================================
// CRUD functions — nhận ServiceClient làm tham số
// Dùng trong API routes với server client
// ============================================================

/**
 * Lấy payment theo ID.
 */
export async function getPaymentById(
  client: ServiceClient,
  id: string
): Promise<Pick<
  PaymentRow,
  "id" | "user_id" | "amount" | "status" | "metadata" | "plan_id" | "provider_transaction_id"
> | null> {
  const { data, error } = await client
    .from("payments")
    .select("id, user_id, amount, status, metadata, plan_id, provider_transaction_id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Pick<
    PaymentRow,
    "id" | "user_id" | "amount" | "status" | "metadata" | "plan_id" | "provider_transaction_id"
  > | null;
}

/**
 * Lấy payment theo provider_transaction_id.
 */
export async function getPaymentByProviderTxnId(
  client: ServiceClient,
  txnId: string
): Promise<Pick<PaymentRow, "id" | "status" | "amount"> | null> {
  const { data, error } = await client
    .from("payments")
    .select("id, status, amount")
    .eq("provider_transaction_id", txnId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Pick<PaymentRow, "id" | "status" | "amount"> | null;
}

/**
 * Tạo payment record mới và trả về ID.
 */
export async function createPaymentRecord(
  client: ServiceClient,
  insert: TablesInsert<"payments">
): Promise<{ id: string }> {
  const { data, error } = await client.from("payments").insert(insert).select("id").single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to create payment record");
  return data as { id: string };
}

/**
 * Cập nhật trạng thái payment.
 */
export async function updatePaymentStatus(
  client: ServiceClient,
  id: string,
  status: TablesUpdate<"payments">["status"]
): Promise<void> {
  const { error } = await client.from("payments").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Merge thêm key-value vào metadata của payment (read-modify-write).
 */
export async function mergePaymentMetadata(
  client: ServiceClient,
  id: string,
  extra: Record<string, unknown>
): Promise<void> {
  const { data: existing } = await client
    .from("payments")
    .select("metadata")
    .eq("id", id)
    .maybeSingle();

  const existingMetadata =
    typeof existing?.metadata === "object" && existing.metadata !== null
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const { error } = await client
    .from("payments")
    .update({ metadata: { ...existingMetadata, ...extra } as Json })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Cập nhật provider_transaction_id của payment (đồng thời có thể merge metadata).
 */
export async function updatePaymentProviderTxnId(
  client: ServiceClient,
  id: string,
  txnId: string | null
): Promise<void> {
  const { error } = await client
    .from("payments")
    .update({ provider_transaction_id: txnId })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Lấy danh sách pending PayOS payments của user.
 * Dùng để cancel trước khi tạo payment mới.
 */
export async function getPendingPayOSPaymentsByUser(
  client: ServiceClient,
  userId: string
): Promise<Pick<PaymentRow, "id" | "provider_transaction_id">[]> {
  const { data, error } = await client
    .from("payments")
    .select("id, provider_transaction_id")
    .eq("user_id", userId)
    .eq("status", EPaymentStatus.Pending)
    .eq("provider", "payos");

  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<PaymentRow, "id" | "provider_transaction_id">[];
}

/**
 * Tính toán số tiền được giảm giá (Proration) dựa trên lượng Credit tiêu thụ thực tế.
 */
export async function calculateCreditBasedProration(
  client: ServiceClient,
  userId: string
): Promise<number> {
  const { data: sub, error: subError } = await client
    .from("subscriptions")
    .select("*, plans(monthly_credits, pricing)")
    .eq("user_id", userId)
    .eq("status", ESubscriptionStatus.Active)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError || !sub || !sub.plans) return 0;

  const planData = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
  if (!planData || planData.monthly_credits <= 0) return 0; // free plan

  const now = new Date();
  const periodEnd = new Date(sub.current_period_end);
  if (now >= periodEnd) return 0;

  const { data: wallet } = await client
    .from("wallets")
    .select("subscription_credits")
    .eq("user_id", userId)
    .maybeSingle();

  const currentCredits = wallet?.subscription_credits ?? 0;

  const pricing = planData.pricing as Record<string, Record<string, number>> | null;
  const pricePaid = pricing?.VND?.[sub.billing_cycle || ESubscriptionCycle.Monthly] ?? 0;
  if (pricePaid <= 0) return 0;

  const isYearly = sub.billing_cycle === ESubscriptionCycle.Yearly;
  const totalCreditsPeriod = planData.monthly_credits * (isYearly ? 12 : 1);

  let fullMonthsLeft = 0;
  if (sub.next_credit_reset_at) {
    const nextReset = new Date(sub.next_credit_reset_at);
    if (nextReset < periodEnd && nextReset >= now) {
      const monthsDiff =
        (periodEnd.getFullYear() - nextReset.getFullYear()) * 12 +
        (periodEnd.getMonth() - nextReset.getMonth());
      fullMonthsLeft = Math.max(0, monthsDiff);
    } else if (nextReset >= periodEnd) {
      // If next reset is at or after period end, no full months left
      fullMonthsLeft = 0;
    } else if (nextReset < now && isYearly) {
      // Fallback calculation just in case next_credit_reset_at is in the past
      const remainingTime = periodEnd.getTime() - now.getTime();
      fullMonthsLeft = Math.floor(remainingTime / (1000 * 60 * 60 * 24 * 30));
    }
  }

  const remainingCredits = fullMonthsLeft * planData.monthly_credits + Math.max(0, currentCredits);

  const discount = Math.floor((remainingCredits / totalCreditsPeriod) * pricePaid);
  return discount;
}
