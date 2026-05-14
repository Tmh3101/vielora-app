"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";
import { ESubscriptionPlan } from "@/types";

type SubscriptionType = Tables<"subscriptions">;

export interface SubscriptionBannerProps {
  subscription: SubscriptionType;
  currentPlan: ESubscriptionPlan;
  creditsUsedThisMonth: number;
  creditsTotalThisMonth: number;
  usagePercent: number;
  paygCredits?: number;
  onUpgrade: () => void;
}

export function SubscriptionBanner({
  subscription,
  currentPlan,
  creditsUsedThisMonth,
  creditsTotalThisMonth,
  usagePercent,
  paygCredits = 0,
  onUpgrade,
}: SubscriptionBannerProps) {
  const router = useRouter();

  return (
    <Card
      className={`relative overflow-hidden ${
        currentPlan === ESubscriptionPlan.Pro
          ? "border-violet-500/30 bg-gradient-to-r from-violet-500/5 via-background to-purple-500/5"
          : currentPlan === ESubscriptionPlan.Standard
            ? "border-blue-500/30 bg-gradient-to-r from-blue-500/5 via-background to-cyan-500/5"
            : "border-border/50 bg-gradient-to-r from-muted/30 via-background to-muted/30"
      }`}
    >
      <div
        className={`absolute left-0 right-0 top-0 h-1 ${
          currentPlan === ESubscriptionPlan.Pro
            ? "bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"
            : currentPlan === ESubscriptionPlan.Standard
              ? "bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500"
              : "bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"
        }`}
      />
      <CardContent className="p-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${
                currentPlan === ESubscriptionPlan.Pro
                  ? "bg-gradient-to-br from-violet-500 to-purple-600"
                  : currentPlan === ESubscriptionPlan.Standard
                    ? "bg-gradient-to-br from-blue-500 to-cyan-600"
                    : "bg-gradient-to-br from-gray-400 to-gray-500"
              }`}
            >
              <Crown className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">
                  Gói{" "}
                  {currentPlan === ESubscriptionPlan.Free
                    ? "Miễn phí"
                    : currentPlan === ESubscriptionPlan.Standard
                      ? "Standard"
                      : currentPlan === ESubscriptionPlan.Pro
                        ? "Pro"
                        : "Enterprise"}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    currentPlan === ESubscriptionPlan.Pro
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                      : currentPlan === ESubscriptionPlan.Standard
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300"
                  }`}
                >
                  {currentPlan.toUpperCase()}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Thời hạn: {new Date(subscription.current_period_start).toLocaleDateString("vi-VN")}{" "}
                - {new Date(subscription.current_period_end).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Credits đã dùng</p>
              {paygCredits > 0 && (
                <p className="mt-1 text-xs font-medium text-primary">
                  + Dư PAYG: {paygCredits.toLocaleString()}
                </p>
              )}
            </div>
            <div className="relative h-24 w-24">
              <svg className="h-full w-full -rotate-90 transform">
                <circle cx="48" cy="48" r="40" className="fill-none stroke-muted stroke-[6]" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  className={`fill-none stroke-[6] transition-all duration-500 ${
                    usagePercent > 90
                      ? "stroke-destructive"
                      : usagePercent > 70
                        ? "stroke-yellow-500"
                        : currentPlan === ESubscriptionPlan.Pro
                          ? "stroke-violet-500"
                          : currentPlan === ESubscriptionPlan.Standard
                            ? "stroke-blue-500"
                            : "stroke-primary"
                  }`}
                  strokeLinecap="round"
                  strokeDasharray={`${usagePercent * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">
                  {creditsUsedThisMonth.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{creditsTotalThisMonth.toLocaleString()}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {currentPlan !== ESubscriptionPlan.Enterprise && (
              <Button
                onClick={onUpgrade}
                className={`btn-glow ${
                  currentPlan === ESubscriptionPlan.Pro
                    ? "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                    : "bg-gradient-primary"
                }`}
              >
                <Crown className="mr-2 h-4 w-4" />
                {currentPlan === ESubscriptionPlan.Free ? "Nâng cấp Pro" : "Nâng cấp"}
              </Button>
            )}

            {usagePercent > 80 && (
              <Button
                onClick={() => router.push("/dashboard/upgrade")}
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10"
              >
                <Zap className="mr-2 h-4 w-4" />
                Nạp Credit lẻ
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
