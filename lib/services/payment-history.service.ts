import type { Tables } from "@/lib/supabase/types";
import type { ServiceClient } from "@/lib/services/types";
import type { PaymentRow } from "@/lib/services/payment.service";
import { EPaymentStatus, EInvoiceStatus } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type PaymentHistoryInvoice = {
  id: string;
  status: EInvoiceStatus;
  error_message: string | null;
  provider_lookup_code: string | null;
};

export type PaymentHistoryItem = Pick<
  PaymentRow,
  | "id"
  | "amount"
  | "currency"
  | "status"
  | "payment_type"
  | "created_at"
  | "plan_id"
  | "metadata"
  | "user_id"
> & {
  plan: Pick<Tables<"plans">, "name" | "code" | "monthly_credits"> | null;
  credits_added: number;
  invoice: PaymentHistoryInvoice | null;
  payerName?: string | null;
  payerEmail?: string | null;
};

export async function getPaymentHistoryByUserId(
  client: ServiceClient,
  userId: string,
  limit = 20,
  offset = 0
): Promise<PaymentHistoryItem[]> {
  const { data, error } = await client
    .from("payments")
    .select(
      "id, amount, currency, status, payment_type, created_at, plan_id, metadata, user_id, plans(name, code, monthly_credits), invoices(id, status, error_message, provider_lookup_code)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const adminClient = createAdminClient();
  const payerIds = Array.from(
    new Set((data ?? []).map((p: { user_id?: string }) => p.user_id).filter(Boolean) as string[])
  );
  const payerMap = new Map<string, { name: string; email: string }>();

  await Promise.all(
    payerIds.map(async (uid) => {
      try {
        const { data: userData } = await adminClient.auth.admin.getUserById(uid);
        if (userData?.user) {
          const u = userData.user;
          const name =
            (u.user_metadata?.full_name as string) ||
            (u.user_metadata?.name as string) ||
            u.email?.split("@")[0] ||
            "";
          const email = u.email || "";
          payerMap.set(uid, { name, email });
        }
      } catch (e) {
        console.error("Error fetching payer user:", e);
      }
    })
  );

  return (
    (data ?? []) as unknown as Array<PaymentHistoryItem & { plans?: unknown; invoices?: unknown }>
  ).map(({ plans, invoices, ...payment }) => {
    const plan = Array.isArray(plans)
      ? ((plans[0] as Pick<Tables<"plans">, "name" | "code" | "monthly_credits"> | undefined) ??
        null)
      : ((plans as Pick<Tables<"plans">, "name" | "code" | "monthly_credits"> | null | undefined) ??
        null);

    const invoiceList = Array.isArray(invoices)
      ? (invoices as PaymentHistoryInvoice[])
      : invoices
        ? [invoices as PaymentHistoryInvoice]
        : [];
    const invoice =
      invoiceList.find(
        (item) =>
          item.status !== EInvoiceStatus.Cancelled && item.status !== EInvoiceStatus.Replaced
      ) ??
      invoiceList[0] ??
      null;

    const metadata =
      typeof payment.metadata === "object" &&
      payment.metadata !== null &&
      !Array.isArray(payment.metadata)
        ? (payment.metadata as Record<string, unknown>)
        : {};
    const creditsFromMetadata = Number(metadata.credits ?? 0);
    const creditAmount =
      creditsFromMetadata > 0 ? creditsFromMetadata : (plan?.monthly_credits ?? 0);

    const payerInfo = payment.user_id ? payerMap.get(payment.user_id) : null;

    return {
      ...payment,
      plan,
      invoice,
      credits_added: payment.status === EPaymentStatus.Completed ? creditAmount : 0,
      payerName: payerInfo?.name || null,
      payerEmail: payerInfo?.email || null,
    };
  });
}

export async function getPaymentHistoryCountByUserId(
  client: ServiceClient,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return count ?? 0;
}

export async function getPaymentHistoryByWorkspaceId(
  _client: ServiceClient,
  workspaceId: string,
  limit = 20,
  offset = 0
): Promise<PaymentHistoryItem[]> {
  const adminClient = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any)
    .from("payments")
    .select(
      "id, amount, currency, status, payment_type, created_at, plan_id, metadata, user_id, plans(name, code, monthly_credits), invoices(id, status, error_message, provider_lookup_code)"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const payerIds = Array.from(
    new Set((data ?? []).map((p: { user_id?: string }) => p.user_id).filter(Boolean) as string[])
  );
  const payerMap = new Map<string, { name: string; email: string }>();

  await Promise.all(
    payerIds.map(async (uid) => {
      try {
        const { data: userData } = await adminClient.auth.admin.getUserById(uid);
        if (userData?.user) {
          const u = userData.user;
          const name =
            (u.user_metadata?.full_name as string) ||
            (u.user_metadata?.name as string) ||
            u.email?.split("@")[0] ||
            "";
          const email = u.email || "";
          payerMap.set(uid, { name, email });
        }
      } catch (e) {
        console.error("Error fetching payer user:", e);
      }
    })
  );

  return (
    (data ?? []) as unknown as Array<PaymentHistoryItem & { plans?: unknown; invoices?: unknown }>
  ).map(({ plans, invoices, ...payment }) => {
    const plan = Array.isArray(plans)
      ? ((plans[0] as Pick<Tables<"plans">, "name" | "code" | "monthly_credits"> | undefined) ??
        null)
      : ((plans as Pick<Tables<"plans">, "name" | "code" | "monthly_credits"> | null | undefined) ??
        null);

    const invoiceList = Array.isArray(invoices)
      ? (invoices as PaymentHistoryInvoice[])
      : invoices
        ? [invoices as PaymentHistoryInvoice]
        : [];
    const invoice =
      invoiceList.find(
        (item) =>
          item.status !== EInvoiceStatus.Cancelled && item.status !== EInvoiceStatus.Replaced
      ) ??
      invoiceList[0] ??
      null;

    const metadata =
      typeof payment.metadata === "object" &&
      payment.metadata !== null &&
      !Array.isArray(payment.metadata)
        ? (payment.metadata as Record<string, unknown>)
        : {};
    const creditsFromMetadata = Number(metadata.credits ?? 0);
    const creditAmount =
      creditsFromMetadata > 0 ? creditsFromMetadata : (plan?.monthly_credits ?? 0);

    const payerInfo = payment.user_id ? payerMap.get(payment.user_id) : null;

    return {
      ...payment,
      plan,
      invoice,
      credits_added: payment.status === EPaymentStatus.Completed ? creditAmount : 0,
      payerName: payerInfo?.name || null,
      payerEmail: payerInfo?.email || null,
    };
  });
}

export async function getPaymentHistoryCountByWorkspaceId(
  _client: ServiceClient,
  workspaceId: string
): Promise<number> {
  const adminClient = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (adminClient as any)
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);

  return count ?? 0;
}
