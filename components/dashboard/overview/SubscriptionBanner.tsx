"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";
import { ESubscriptionPlan } from "@/types";
import { getPlanTheme } from "@/config/plan-theme";
import { useTranslations } from "next-intl";

type SubscriptionType = Tables<"subscriptions">;

export interface SubscriptionBannerProps {
  subscription?: SubscriptionType | null;
  currentPlan: ESubscriptionPlan;
  creditsUsedThisMonth: number;
  creditsTotalThisMonth: number;
  usagePercent: number;
  paygCredits?: number;
  onUpgrade: () => void;
  onBuyCredits?: () => void;
}

export function SubscriptionBanner({
  subscription,
  currentPlan,
  creditsUsedThisMonth,
  creditsTotalThisMonth,
  usagePercent,
  paygCredits = 0,
  onUpgrade,
  onBuyCredits,
}: SubscriptionBannerProps) {
  const t = useTranslations("dashboard.overview.banner");
  const router = useRouter();

  const normalizedPlan = (currentPlan || ESubscriptionPlan.Free).toLowerCase();
  const theme = getPlanTheme(normalizedPlan);

  const isEnterprise =
    normalizedPlan === ESubscriptionPlan.Enterprise || normalizedPlan === "enterprise";
  const isStandard = normalizedPlan === ESubscriptionPlan.Standard || normalizedPlan === "standard";
  const isPro = normalizedPlan === ESubscriptionPlan.Pro || normalizedPlan === "pro";
  const isFree = !isEnterprise && !isStandard && !isPro;

  const formattedPeriod =
    subscription?.current_period_start && subscription?.current_period_end
      ? `${new Date(subscription.current_period_start).toLocaleDateString()} - ${new Date(
          subscription.current_period_end
        ).toLocaleDateString()}`
      : t("permanent");

  return (
    <Card
      className={`relative overflow-hidden border backdrop-blur-md transition-all ${theme.borderClass} ${theme.bgGradientClass} shadow-lg`}
    >
      {/* Top accent bar matching plan theme */}
      <div
        className={`absolute left-0 right-0 top-0 h-1 ${
          isPro
            ? "bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"
            : isStandard
              ? "bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500"
              : isEnterprise
                ? "bg-gradient-to-r from-slate-600 via-zinc-600 to-slate-600"
                : "bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400"
        }`}
      />
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md sm:h-14 sm:w-14 ${
                isPro
                  ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/25"
                  : isStandard
                    ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-blue-500/25"
                    : isEnterprise
                      ? "bg-gradient-to-br from-slate-700 to-zinc-900 text-white shadow-slate-500/25"
                      : "bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-slate-500/20"
              }`}
            >
              <Crown className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${theme.badgeClass}`}
                >
                  {t("planLabel", { plan: isFree ? t("freePlan") : normalizedPlan.toUpperCase() })}
                </span>
              </div>
              {!isFree && (
                <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                  {t("period", { period: formattedPeriod })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-start sm:gap-6">
            <div className="text-left sm:text-right">
              <p className="text-xs font-medium text-muted-foreground">{t("creditsUsage")}</p>
              {paygCredits > 0 && (
                <p className="mt-0.5 text-xs font-semibold text-primary">
                  {t("paygCredits", { amount: paygCredits.toLocaleString() })}
                </p>
              )}
            </div>
            <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" className="fill-none stroke-muted/40 stroke-[5]" />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  className={`fill-none stroke-[5] transition-all duration-500 ${
                    usagePercent > 90
                      ? "stroke-destructive"
                      : usagePercent > 70
                        ? "stroke-amber-500"
                        : isPro
                          ? "stroke-violet-500"
                          : isStandard
                            ? "stroke-blue-500"
                            : "stroke-slate-600"
                  }`}
                  strokeLinecap="round"
                  strokeDasharray={`${(usagePercent * 201) / 100} 201`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground sm:text-sm">
                  {creditsUsedThisMonth.toLocaleString()}
                  <span className="text-[10px] font-normal text-muted-foreground sm:text-xs">
                    /{creditsTotalThisMonth.toLocaleString()}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Button
              onClick={onUpgrade}
              className={`h-9 w-full gap-1.5 rounded-xl px-4 text-xs font-semibold shadow-sm transition-all duration-200 hover:brightness-105 active:scale-[0.98] sm:w-auto ${theme.buttonClass}`}
            >
              <Crown className="h-3.5 w-3.5" />
              {t("upgradeBtn")}
            </Button>

            {usagePercent > 80 && (
              <Button
                onClick={onBuyCredits ?? (() => router.push("/dashboard/upgrade"))}
                variant="outline"
                className="h-9 w-full gap-1.5 rounded-xl border-primary/40 px-4 text-xs font-semibold text-primary transition-all duration-200 hover:bg-primary/10 active:scale-[0.98] sm:w-auto"
              >
                <Zap className="h-3.5 w-3.5" />
                {t("buyCreditsBtn")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
