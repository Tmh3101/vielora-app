"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";
import { ESubscriptionPlan } from "@/types";

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
  const router = useRouter();

  const formattedPeriod =
    subscription?.current_period_start && subscription?.current_period_end
      ? `${new Date(subscription.current_period_start).toLocaleDateString("vi-VN")} - ${new Date(
          subscription.current_period_end
        ).toLocaleDateString("vi-VN")}`
      : "Vĩnh viễn (Gói Miễn phí)";

  return (
    <Card
      className={`relative overflow-hidden border backdrop-blur-md transition-all ${
        currentPlan === ESubscriptionPlan.Pro
          ? "border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-card/80 to-purple-500/5 shadow-lg shadow-violet-500/5"
          : currentPlan === ESubscriptionPlan.Standard
            ? "border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-card/80 to-cyan-500/5 shadow-lg shadow-blue-500/5"
            : "border-border/60 bg-gradient-to-br from-card/60 via-card/90 to-muted/20 shadow-sm"
      }`}
    >
      <div
        className={`absolute left-0 right-0 top-0 h-1 ${
          currentPlan === ESubscriptionPlan.Pro
            ? "bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"
            : currentPlan === ESubscriptionPlan.Standard
              ? "bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500"
              : "bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400"
        }`}
      />
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md sm:h-14 sm:w-14 ${
                currentPlan === ESubscriptionPlan.Pro
                  ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/25"
                  : currentPlan === ESubscriptionPlan.Standard
                    ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-blue-500/25"
                    : "bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-slate-500/20"
              }`}
            >
              <Crown className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    currentPlan === ESubscriptionPlan.Pro
                      ? "border border-violet-500/30 bg-violet-500/15 text-violet-600 dark:text-violet-300"
                      : currentPlan === ESubscriptionPlan.Standard
                        ? "border border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-300"
                        : "border border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Gói{" "}
                  {currentPlan === ESubscriptionPlan.Free ? "Miễn phí" : currentPlan.toUpperCase()}
                </span>
              </div>
              {currentPlan !== ESubscriptionPlan.Free && (
                <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                  Thời hạn: {formattedPeriod}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-start sm:gap-6">
            <div className="text-left sm:text-right">
              <p className="text-xs font-medium text-muted-foreground">Credits đã dùng</p>
              {paygCredits > 0 && (
                <p className="mt-0.5 text-xs font-semibold text-primary">
                  + Dư PAYG: {paygCredits.toLocaleString()}
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
                        : currentPlan === ESubscriptionPlan.Pro
                          ? "stroke-violet-500"
                          : currentPlan === ESubscriptionPlan.Standard
                            ? "stroke-blue-500"
                            : "stroke-slate-500"
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
            {currentPlan !== ESubscriptionPlan.Enterprise && (
              <Button
                onClick={onUpgrade}
                className={`w-full rounded-xl px-5 font-semibold shadow-md transition-all sm:w-auto ${
                  currentPlan === ESubscriptionPlan.Pro
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-violet-500/20 hover:from-violet-700 hover:to-purple-700"
                    : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90"
                }`}
              >
                Nâng cấp gói
              </Button>
            )}

            {usagePercent > 80 && (
              <Button
                onClick={onBuyCredits ?? (() => router.push("/dashboard/upgrade"))}
                variant="outline"
                className="w-full rounded-xl border-primary/40 text-primary hover:bg-primary/10 sm:w-auto"
              >
                <Zap className="mr-2 h-4 w-4" />
                Nạp Credits
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
