import type { ServiceClient } from "@/lib/services/types";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import {
  ESubscriptionCycle,
  EPaymentStatus,
  EPaymentType,
  ESubscriptionStatus,
} from "@/types/enums";
import { sendPaymentConfirmationEmail, getUserEmailById } from "@/lib/services/email.service";

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

  // For PAYG payments, we might want to handle them differently in the future
  // TODO: Implement PAYG processing logic
  if (payment.payment_type === EPaymentType.PayAsYouGo) {
    return { success: true, message: "PAYG processing skipped for now" };
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

  const { data: subscription, error: subscriptionError } = await client
    .from("subscriptions")
    .select("id")
    .eq("user_id", payment.user_id)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(`Failed to fetch subscription: ${subscriptionError.message}`);
  }

  if (!subscription) {
    throw new Error(`Subscription not found for user ${payment.user_id}`);
  }

  const periodStartDate = new Date();
  const periodEndDate = new Date(periodStartDate);

  if (cycle === ESubscriptionCycle.Monthly) {
    periodEndDate.setMonth(periodEndDate.getMonth() + 1);
  } else {
    periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
  }

  const periodStartIso = periodStartDate.toISOString();
  const periodEndIso = periodEndDate.toISOString();

  const { error: subscriptionUpdateError } = await client
    .from("subscriptions")
    .update({
      status: ESubscriptionStatus.Active,
      plan_id: plan.id,
      billing_cycle: cycle,
      current_period_start: periodStartIso,
      current_period_end: periodEndIso,
    })
    .eq("id", subscription.id);

  if (subscriptionUpdateError) {
    throw new Error(`Failed to update subscription: ${subscriptionUpdateError.message}`);
  }

  const { error: walletError } = await client
    .from("wallets")
    .update({ subscription_credits: plan.monthly_credits })
    .eq("user_id", payment.user_id);

  if (walletError) {
    throw new Error(`Failed to update wallet credits: ${walletError.message}`);
  }

  const { error: paymentUpdateError } = await client
    .from("payments")
    .update({ status: EPaymentStatus.Completed })
    .eq("id", paymentId);

  if (paymentUpdateError) {
    throw new Error(`Failed to mark payment as completed: ${paymentUpdateError.message}`);
  }

  const transaction: CreditTransactionInsert = {
    user_id: payment.user_id,
    payment_id: payment.id,
    amount: plan.monthly_credits,
    transaction_type: "subscription_renewal",
    description: `Gia hạn gói ${plan.name} chu kỳ ${cycle}`,
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
      currency: ((payment.metadata as Record<string, unknown>)?.currency as string) ?? "VND",
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
