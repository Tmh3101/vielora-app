import { PLAN_RANK } from "@/lib/constants";

export function isPlanSufficient(currentPlan: string, requiredPlan: string): boolean {
  const userRank = PLAN_RANK[currentPlan] ?? 0;
  return userRank >= (PLAN_RANK[requiredPlan] ?? Infinity);
}
