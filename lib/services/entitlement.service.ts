import type { ServiceClient } from "@/lib/services/types";
import { ESubscriptionPlan, ESubscriptionCycle } from "@/types";

export interface EffectiveEntitlements {
  botsLimit: number;
  monthlyCredits: number;
  planCode: ESubscriptionPlan;
  billingCycle: ESubscriptionCycle;
  isEnterprise: boolean;
}

export async function getEffectiveEntitlements(
  client: ServiceClient,
  workspaceId: string
): Promise<EffectiveEntitlements | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from("subscriptions")
    .select(
      `plan_id, billing_cycle, status,
       bots_limit_override, monthly_credits_override,
       plans!inner(code, bots_limit, monthly_credits)`
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planObj = Array.isArray(data.plans) ? data.plans[0] : (data.plans as any);
  if (!planObj) return null;

  const botsLimit = data.bots_limit_override ?? planObj.bots_limit;
  const monthlyCredits = data.monthly_credits_override ?? planObj.monthly_credits;
  const planCode = planObj.code as ESubscriptionPlan;

  return {
    botsLimit,
    monthlyCredits,
    planCode,
    billingCycle: data.billing_cycle as ESubscriptionCycle,
    isEnterprise: planCode === ESubscriptionPlan.Enterprise,
  };
}
