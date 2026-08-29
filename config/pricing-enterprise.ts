import { ESubscriptionCycle } from "@/types";
import { CREDIT_UNIT_PRICE_EXPANSION } from "@/config/credit-pricing";

export const ENTERPRISE_PRICE = {
  bots: { min: 20, max: 2000, step: 1 },
  monthlyCredits: { min: 5_000, max: 100_000, step: 1_000 },
  perBotPerMonth: 10_000,
  perCreditUnitPerMonth: CREDIT_UNIT_PRICE_EXPANSION * 1_000,
  base: 1_190_000,
  floor: 1_190_000,
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

export interface EnterprisePriceOptions {
  pricing?: Record<string, Record<string, number>> | null;
  currency?: string;
  minBots?: number;
  minCredits?: number;
}

export function calculateEnterprisePrice(
  bots: number,
  monthlyCredits: number,
  cycle: ESubscriptionCycle,
  options?: EnterprisePriceOptions
): number {
  const minBots = options?.minBots ?? ENTERPRISE_PRICE.bots.min;
  const minCredits = options?.minCredits ?? ENTERPRISE_PRICE.monthlyCredits.min;
  const currency = options?.currency || ENTERPRISE_PRICE.currency;

  const validBots = clampValue(
    bots,
    minBots,
    ENTERPRISE_PRICE.bots.max,
    ENTERPRISE_PRICE.bots.step
  );
  const validCredits = clampValue(
    monthlyCredits,
    minCredits,
    ENTERPRISE_PRICE.monthlyCredits.max,
    ENTERPRISE_PRICE.monthlyCredits.step
  );

  const extraBots = validBots - minBots;
  const extraCredits = validCredits - minCredits;

  const extraBotsMonthly = extraBots * ENTERPRISE_PRICE.perBotPerMonth;
  const extraCreditsMonthly = (extraCredits / 1000) * ENTERPRISE_PRICE.perCreditUnitPerMonth;
  const extraMonthlyTotal = extraBotsMonthly + extraCreditsMonthly;

  // Resolve base price from DB pricing or fallback
  const dbMonthly = options?.pricing?.[currency]?.monthly;
  const dbYearly = options?.pricing?.[currency]?.yearly;

  if (cycle === ESubscriptionCycle.Yearly) {
    const baseYearly =
      typeof dbYearly === "number" && dbYearly > 0
        ? dbYearly
        : typeof dbMonthly === "number" && dbMonthly > 0
          ? dbMonthly * 10
          : ENTERPRISE_PRICE.base * 10;

    const extraYearlyTotal = extraMonthlyTotal * 10;
    const finalYearlyPrice = Math.max(baseYearly, Math.round(baseYearly + extraYearlyTotal));

    return finalYearlyPrice;
  }

  const baseMonthly =
    typeof dbMonthly === "number" && dbMonthly > 0 ? dbMonthly : ENTERPRISE_PRICE.base;

  const monthlyFloor =
    typeof dbMonthly === "number" && dbMonthly > 0 ? dbMonthly : ENTERPRISE_PRICE.floor;

  const finalMonthlyPrice = Math.max(monthlyFloor, Math.round(baseMonthly + extraMonthlyTotal));

  return finalMonthlyPrice;
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
  const finalUpgradePrice = Math.max(
    0,
    Math.round(effectiveMonthlyExtra * Math.max(1, remainingMonths))
  );

  return finalUpgradePrice;
}
