import type { Tables } from "@/lib/supabase/types";
import type { ServiceClient } from "@/lib/services/types";
import type { PaymentRow } from "@/lib/services/payment.service";
import { EPaymentStatus } from "@/types";

export type PaymentHistoryItem = Pick<
  PaymentRow,
  "id" | "amount" | "currency" | "status" | "payment_type" | "created_at" | "plan_id" | "metadata"
> & {
  plan: Pick<Tables<"plans">, "name" | "code" | "monthly_credits"> | null;
  credits_added: number;
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
      "id, amount, currency, status, payment_type, created_at, plan_id, metadata, plans(name, code, monthly_credits)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as Array<PaymentHistoryItem & { plans?: unknown }>).map(
    ({ plans, ...payment }) => {
      const plan = Array.isArray(plans)
        ? ((plans[0] as Pick<Tables<"plans">, "name" | "code" | "monthly_credits"> | undefined) ??
          null)
        : ((plans as
            | Pick<Tables<"plans">, "name" | "code" | "monthly_credits">
            | null
            | undefined) ?? null);
      const metadata =
        typeof payment.metadata === "object" &&
        payment.metadata !== null &&
        !Array.isArray(payment.metadata)
          ? (payment.metadata as Record<string, unknown>)
          : {};
      const creditsFromMetadata = Number(metadata.credits ?? 0);
      const creditAmount =
        creditsFromMetadata > 0 ? creditsFromMetadata : (plan?.monthly_credits ?? 0);

      return {
        ...payment,
        plan,
        credits_added: payment.status === EPaymentStatus.Completed ? creditAmount : 0,
      };
    }
  );
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
