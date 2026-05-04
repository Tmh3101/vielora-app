import type { PlanCode } from "@/config/pricing";

export interface PlanComparisonState {
  isCurrentPlan: boolean;
  isDowngrade: boolean;
  isUpgrade: boolean;
}

export function comparePlans(
  currentPlanCode: string | null | undefined,
  targetPlanCode: string,
  planOrderArray: readonly PlanCode[]
): PlanComparisonState {
  const normalizedCurrent = (currentPlanCode ?? "free") as PlanCode;
  const currentPlanIndex = planOrderArray.indexOf(normalizedCurrent);
  const targetPlanIndex = planOrderArray.indexOf(targetPlanCode as PlanCode);

  if (currentPlanIndex < 0 || targetPlanIndex < 0) {
    return {
      isCurrentPlan: normalizedCurrent === targetPlanCode,
      isDowngrade: false,
      isUpgrade: false,
    };
  }

  return {
    isCurrentPlan: normalizedCurrent === targetPlanCode,
    isDowngrade: targetPlanIndex < currentPlanIndex,
    isUpgrade: targetPlanIndex > currentPlanIndex,
  };
}
