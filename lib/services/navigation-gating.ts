import { ESubscriptionPlan } from "@/types";
import { SUGGESTED_QUESTIONS_ALLOWED_PLANS } from "@/config";
import { getBotActivePlanCode } from "@/lib/services/subscription.service";
import type { ServiceClient } from "@/lib/services/types";

/**
 * Smart Homepage (SH-001) is gated to paid plans only, mirroring the
 * existing suggested-questions gating in /api/widget/init.
 *
 * Free plan: feature fully disabled (no backend processing).
 * Standard / Pro / Enterprise: full feature access.
 */
export function isNavigationEnabledForPlan(planCode: ESubscriptionPlan | null): boolean {
  if (!planCode) return false;
  return SUGGESTED_QUESTIONS_ALLOWED_PLANS.includes(planCode as ESubscriptionPlan);
}

/**
 * Convenience async wrapper — resolves the bot's active plan then checks.
 * Returns false when the bot has no workspace (treated as Free).
 */
export async function isNavigationEnabledForBot(
  client: ServiceClient,
  bot: { workspace_id?: string | null }
): Promise<boolean> {
  const planCode = await getBotActivePlanCode(client, bot);
  return isNavigationEnabledForPlan(planCode);
}
