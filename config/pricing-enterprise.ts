import { ESubscriptionCycle } from "@/types";

export const ENTERPRISE_PRICE = {
  bots: { min: 50, max: 2000, step: 1 },
  monthlyCredits: { min: 10_000, max: 100_000, step: 1_000 },
  perBotPerMonth: 10_000,
  perCreditUnitPerMonth: 100_000,
  base: 1_490_000,
  floor: 1_490_000,
  discountYearly: 10 / 12,
  currency: "VND",
};

export function clampValue(val: number, min: number, max: number, step?: number): number {
  const clamped = Math.min(Math.max(val, min), max);
  if (step && step > 0) {
    return Math.round(clamped / step) * step;
  }
  return clamped;
}

export function calculateEnterprisePrice(
  bots: number,
  monthlyCredits: number,
  cycle: ESubscriptionCycle
): number {
  const validBots = clampValue(
    bots,
    ENTERPRISE_PRICE.bots.min,
    ENTERPRISE_PRICE.bots.max,
    ENTERPRISE_PRICE.bots.step
  );
  const validCredits = clampValue(
    monthlyCredits,
    ENTERPRISE_PRICE.monthlyCredits.min,
    ENTERPRISE_PRICE.monthlyCredits.max,
    ENTERPRISE_PRICE.monthlyCredits.step
  );

  const extraBots = validBots - ENTERPRISE_PRICE.bots.min;
  const extraCredits = validCredits - ENTERPRISE_PRICE.monthlyCredits.min;

  const rawMonthly =
    ENTERPRISE_PRICE.base +
    extraBots * ENTERPRISE_PRICE.perBotPerMonth +
    (extraCredits / 1000) * ENTERPRISE_PRICE.perCreditUnitPerMonth;

  const monthlyPrice = Math.max(ENTERPRISE_PRICE.floor, Math.round(rawMonthly));

  if (cycle === ESubscriptionCycle.Yearly) {
    return Math.round(monthlyPrice * 10);
  }

  return monthlyPrice;
}

export function calculateEnterpriseUpgradePrice(
  deltaBots: number,
  deltaCredits: number,
  cycle: ESubscriptionCycle,
  remainingMonths: number
): number {
  const safeBots = Math.max(0, deltaBots);
  const safeCredits = Math.max(0, deltaCredits);
  const extraBotsCost = safeBots * ENTERPRISE_PRICE.perBotPerMonth;
  const extraCreditsCost = (safeCredits / 1000) * ENTERPRISE_PRICE.perCreditUnitPerMonth;
  const monthlyExtra = extraBotsCost + extraCreditsCost;
  const effectiveMonthlyExtra =
    cycle === ESubscriptionCycle.Yearly ? monthlyExtra * (10 / 12) : monthlyExtra;
  return Math.max(0, Math.round(effectiveMonthlyExtra * Math.max(1, remainingMonths)));
}
