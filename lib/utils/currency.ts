import type { Tables } from "@/lib/supabase/types";
import type { BillingCycle } from "@/config/pricing";

export function formatVND(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "0";
  if (amount === 0) return "0";

  return amount.toLocaleString("vi-VN");
}

export function getPriceFromPlan(
  plan: Tables<"plans"> | null | undefined,
  cycle: BillingCycle
): number {
  if (!plan) return 0;

  try {
    const pricing = plan.pricing as Record<string, Record<string, number>> | null;
    return pricing?.VND?.[cycle] ?? 0;
  } catch {
    return 0;
  }
}
