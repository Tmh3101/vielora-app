import type { ServiceClient } from "@/lib/services/types";
import type { Tables } from "@/lib/supabase/types";
import { ETransactionType } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreditPackageRow = Tables<"credit_packages">;

export interface CreditPackagePrice {
  USD?: number;
  VND?: number;
}

export async function getCreditPackageById(client: ServiceClient, packageId: string) {
  const { data, error } = await client
    .from("credit_packages")
    .select("*")
    .eq("id", packageId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CreditPackageRow | null;
}

const MAX_DEDUCTION_RETRIES = 3;

export interface CreditDeductionResult {
  success: boolean;
  message?: string;
  deductedFromSubscription?: number;
  deductedFromPayg?: number;
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

// Workspace-scoped credit methods
// ============================================================

export interface WorkspaceCreditSummary {
  totalCredits: number;
  subscriptionCredits: number;
  paygCredits: number;
  isPaygEnabled: boolean;
  creditsUsedThisMonth: number;
}

/**
 * Lấy thông tin tổng quan credits theo workspaceId.
 */
export async function getWorkspaceCreditSummary(
  client: ServiceClient,
  workspaceId: string
): Promise<WorkspaceCreditSummary | null> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/credits`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (err) {
      console.error("Error fetching workspace credits via API:", err);
    }
    // Don't fall through to direct query on browser — RLS will block admin users
    return null;
  }

  const activeClient = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wallet, error } = await (activeClient as any)
    .from("wallets")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !wallet) return null;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Tính credits đã dùng trong tháng từ credit_transactions theo workspace
  // (index + chat, trừ refund) — nhất quán với deductWorkspaceCredits/refundWorkspaceCredits
  const indexTypes = [
    ETransactionType.IndexPages,
    ETransactionType.IndexPagesRefund,
    ETransactionType.AddKnowledge,
    ETransactionType.AddKnowledgeRefund,
    ETransactionType.UpdateKnowledge,
    ETransactionType.UpdateKnowledgeRefund,
  ];
  const chatTypes = [ETransactionType.ChatMessage, ETransactionType.ChatMessageRefund];
  const usageTypes = [...indexTypes, ...chatTypes];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usageTx, error: usageError } = await (activeClient as any)
    .from("credit_transactions")
    .select("amount, transaction_type")
    .eq("workspace_id", workspaceId)
    .in("transaction_type", usageTypes)
    .gte("created_at", startOfMonth.toISOString());

  if (usageError) {
    console.error("Failed to fetch usage transactions:", usageError.message);
  }

  // amount âm khi trừ credits → dùng - để ra số dương đã sử dụng
  const netUsed = (usageTx ?? []).reduce(
    (acc: number, tx: { amount: number }) => acc + tx.amount,
    0
  );
  const creditsUsedThisMonth = Math.max(0, -netUsed);

  return {
    totalCredits: wallet.total_credits ?? 0,
    subscriptionCredits: wallet.subscription_credits ?? 0,
    paygCredits: wallet.payg_credits ?? 0,
    isPaygEnabled: wallet.is_payg_enabled ?? false,
    creditsUsedThisMonth,
  };
}

/**
 * Lấy số lượng tin nhắn trong tháng theo workspaceId.
 */
export async function getWorkspaceMonthlyMessageCount(
  client: ServiceClient,
  workspaceId: string,
  action: string,
  startOfMonth: Date
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (client as any)
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("action", action)
    .gte("created_at", startOfMonth.toISOString());

  return count ?? 0;
}

export interface DeductWorkspaceCreditsParams {
  workspaceId: string;
  creditAmount: number;
  transactionType: ETransactionType;
  transactionDescription: string;
}

export async function deductWorkspaceCredits(
  client: ServiceClient,
  params: DeductWorkspaceCreditsParams
): Promise<CreditDeductionResult> {
  const { workspaceId, creditAmount, transactionType, transactionDescription } = params;

  if (creditAmount <= 0) {
    return { success: true, deductedFromSubscription: 0, deductedFromPayg: 0 };
  }

  const adminClient = createAdminClient();

  for (let attempt = 1; attempt <= MAX_DEDUCTION_RETRIES; attempt += 1) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: wallet, error: walletError } = await (adminClient as any)
      .from("wallets")
      .select("subscription_credits,payg_credits,total_credits,is_payg_enabled")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (walletError) {
      return { success: false, message: walletError.message };
    }

    if (!wallet) {
      return { success: false, message: "Workspace wallet not found" };
    }

    if (wallet.total_credits < creditAmount) {
      return { success: false, message: "Insufficient workspace credits." };
    }

    const deductedFromSubscription = Math.min(wallet.subscription_credits, creditAmount);
    const deductedFromPayg = creditAmount - deductedFromSubscription;
    const nextSubscriptionCredits = wallet.subscription_credits - deductedFromSubscription;
    const nextPaygCredits = wallet.payg_credits - deductedFromPayg;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedWallet, error: updateWalletError } = await (adminClient as any)
      .from("wallets")
      .update({
        subscription_credits: nextSubscriptionCredits,
        payg_credits: nextPaygCredits,
      })
      .eq("workspace_id", workspaceId)
      .eq("subscription_credits", wallet.subscription_credits)
      .eq("payg_credits", wallet.payg_credits)
      .select("workspace_id")
      .maybeSingle();

    if (updateWalletError) {
      return { success: false, message: updateWalletError.message };
    }

    if (!updatedWallet) {
      if (attempt === MAX_DEDUCTION_RETRIES) {
        return { success: false, message: "Unable to deduct workspace credits. Please try again." };
      }
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: transactionError } = await (adminClient as any)
      .from("credit_transactions")
      .insert({
        workspace_id: workspaceId,
        amount: -creditAmount,
        transaction_type: transactionType,
        description: transactionDescription,
      });

    if (transactionError) {
      console.error("Failed to insert workspace credit transaction:", transactionError);
    }

    return {
      success: true,
      deductedFromSubscription,
      deductedFromPayg,
    };
  }

  return { success: false, message: "Failed to deduct workspace credits after retries." };
}

export interface RefundWorkspaceCreditsParams {
  workspaceId: string;
  deductedFromSubscription: number;
  deductedFromPayg: number;
  transactionType: ETransactionType;
  transactionDescription: string;
}

export async function refundWorkspaceCredits(
  client: ServiceClient,
  params: RefundWorkspaceCreditsParams
): Promise<void> {
  const {
    workspaceId,
    deductedFromSubscription,
    deductedFromPayg,
    transactionType,
    transactionDescription,
  } = params;

  const totalRefund = deductedFromSubscription + deductedFromPayg;
  if (totalRefund <= 0) return;

  const adminClient = createAdminClient();

  for (let attempt = 1; attempt <= MAX_DEDUCTION_RETRIES; attempt += 1) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: wallet, error: walletError } = await (adminClient as any)
      .from("wallets")
      .select("subscription_credits,payg_credits")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (walletError || !wallet) return;

    const nextSubscriptionCredits = wallet.subscription_credits + deductedFromSubscription;
    const nextPaygCredits = wallet.payg_credits + deductedFromPayg;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedWallet } = await (adminClient as any)
      .from("wallets")
      .update({
        subscription_credits: nextSubscriptionCredits,
        payg_credits: nextPaygCredits,
      })
      .eq("workspace_id", workspaceId)
      .eq("subscription_credits", wallet.subscription_credits)
      .eq("payg_credits", wallet.payg_credits)
      .select("workspace_id")
      .maybeSingle();

    if (updatedWallet) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any).from("credit_transactions").insert({
        workspace_id: workspaceId,
        amount: totalRefund,
        transaction_type: transactionType,
        description: transactionDescription,
      });
      return;
    }
  }
}

export async function deductBotCredits(
  client: ServiceClient,
  bot: { user_id: string; workspace_id?: string | null },
  params: {
    creditAmount: number;
    transactionType: ETransactionType;
    transactionDescription: string;
  }
): Promise<CreditDeductionResult> {
  if (bot.workspace_id) {
    return deductWorkspaceCredits(client, {
      workspaceId: bot.workspace_id,
      creditAmount: params.creditAmount,
      transactionType: params.transactionType,
      transactionDescription: params.transactionDescription,
    });
  }
  return { success: false, message: "Bot has no workspace, cannot deduct credits." };
}

export async function refundBotCredits(
  client: ServiceClient,
  bot: { user_id: string; workspace_id?: string | null },
  params: {
    deductedFromSubscription: number;
    deductedFromPayg: number;
    transactionType: ETransactionType;
    transactionDescription: string;
  }
): Promise<void> {
  if (bot.workspace_id) {
    return refundWorkspaceCredits(client, {
      workspaceId: bot.workspace_id,
      deductedFromSubscription: params.deductedFromSubscription,
      deductedFromPayg: params.deductedFromPayg,
      transactionType: params.transactionType,
      transactionDescription: params.transactionDescription,
    });
  }
  console.warn("Cannot refund credits: bot has no workspace", { botId: bot.user_id });
}
