"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, Crown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PricingToggle } from "@/components/shared/pricing/PricingToggle";
import { PricingCard } from "@/components/shared/pricing/PricingCard";
import { planCTA, planFeatures, planOrder, getPlanTheme } from "@/config/pricing";
import { comparePlans } from "@/lib/utils/pricing";
import type { Tables } from "@/lib/supabase/types";
import { ESubscriptionPlan, ESubscriptionCycle } from "@/types";
import { PaymentAction } from "@/lib/constants";
import { formatPaymentDate } from "@/lib/helpers/payment-helpers";
import { formatVND } from "@/lib/utils/currency";

import {
  WorkspaceUpgradeSelector,
  type WorkspaceSelectorItem,
} from "@/components/dashboard/upgrade/WorkspaceUpgradeSelector";

type PurchaseTab = "plans" | "credits";

interface UpgradeClientProps {
  userWorkspaces?: WorkspaceSelectorItem[];
  activePlans: Tables<"plans">[];
  currentSubscription: Tables<"subscriptions"> | null;
  currentPlan: Tables<"plans"> | null;
  initialPlanCode: string | null;
  initialBillingCycle: ESubscriptionCycle;
  creditPackages: Tables<"credit_packages">[];
  workspaceId?: string | null;
  workspaceWallet?: { total_credits: number } | null;
  workspaceCreditSummary?: { subscriptionCredits: number; paygCredits: number } | null;
}

function setWorkspaceCookie(wsId: string) {
  if (typeof document !== "undefined") {
    document.cookie = `active_workspace_id=${wsId}; path=/; max-age=2592000; SameSite=Lax`;
  }
}

export default function UpgradeClient({
  userWorkspaces = [],
  activePlans,
  currentSubscription,
  currentPlan,
  initialPlanCode,
  initialBillingCycle,
  creditPackages = [],
  workspaceId: initialWorkspaceId,
  workspaceWallet,
  workspaceCreditSummary,
}: UpgradeClientProps) {
  const router = useRouter();
  const currentWs =
    userWorkspaces.find((w) => w.id === initialWorkspaceId) || userWorkspaces[0] || null;
  const [selectedSlug, setSelectedSlug] = useState<string | null>(currentWs?.slug ?? null);
  const [billingCycle, setBillingCycle] = useState<ESubscriptionCycle>(initialBillingCycle);
  const [purchaseTab, setPurchaseTab] = useState<PurchaseTab>("plans");
  const processingPlan: string | null = null;

  const handleWorkspaceChange = (slug: string, wsId: string) => {
    setSelectedSlug(slug);
    setWorkspaceCookie(wsId);
    window.location.href = `/${encodeURIComponent(slug)}/upgrade`;
  };

  const handleChangePlan = (planCode: string) => {
    const targetSlug = selectedSlug || currentWs?.slug || "dashboard";
    const targetBase =
      targetSlug === "dashboard" ? "/dashboard" : `/${encodeURIComponent(targetSlug)}`;

    if (planCode === ESubscriptionPlan.Enterprise) {
      router.push(`${targetBase}/upgrade/enterprise?cycle=${billingCycle}`);
      return;
    }

    if (planCode === ESubscriptionPlan.Free) {
      toast.info("Gói Free chỉ được tự động kích hoạt khi gói trả phí hết hạn");
      return;
    }

    let action = PaymentAction.Upgrade;
    if (currentPlan && currentPlan.code === planCode) {
      if (currentSubscription?.billing_cycle !== billingCycle) {
        toast.error("Vui lòng chọn đúng chu kỳ để gia hạn");
        return;
      }
      action = PaymentAction.Renew;
    }

    router.push(`${targetBase}/checkout?plan=${planCode}&cycle=${billingCycle}&action=${action}`);
  };

  const now = new Date();
  let hasQueuedCycle = false;
  if (currentSubscription?.current_period_end) {
    const periodEnd = new Date(currentSubscription.current_period_end);
    if (periodEnd > now) {
      const daysLeft = (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (currentSubscription.billing_cycle === ESubscriptionCycle.Monthly && daysLeft > 35) {
        hasQueuedCycle = true;
      } else if (
        currentSubscription.billing_cycle === ESubscriptionCycle.Yearly &&
        daysLeft > 370
      ) {
        hasQueuedCycle = true;
      }
    }
  }

  const planCode = (currentPlan?.code as ESubscriptionPlan | undefined) || ESubscriptionPlan.Free;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <WorkspaceUpgradeSelector
          workspaces={userWorkspaces}
          selectedSlug={selectedSlug}
          onSelectWorkspace={handleWorkspaceChange}
        />

        <Card
          className={`relative overflow-hidden border backdrop-blur-md transition-all ${getPlanTheme(planCode).borderClass} ${getPlanTheme(planCode).bgGradientClass} shadow-sm`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-md ${
                    planCode === ESubscriptionPlan.Pro
                      ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/25"
                      : planCode === ESubscriptionPlan.Standard
                        ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-blue-500/25"
                        : "bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-slate-500/20"
                  }`}
                >
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Gói hiện tại</span>
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider border ${getPlanTheme(planCode).badgeClass}`}
                    >
                      {planCode.toUpperCase()}
                    </span>
                  </div>
                  <CardDescription className="mt-1 text-xs sm:text-sm">
                    {currentSubscription?.current_period_end &&
                      planCode !== ESubscriptionPlan.Free && (
                        <>Hết hạn: {formatPaymentDate(currentSubscription.current_period_end)}</>
                      )}
                  </CardDescription>
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium text-muted-foreground">Giới hạn hiện tại</p>
                <p className="text-sm font-semibold text-foreground">
                  {currentSubscription?.bots_limit_override ?? currentPlan?.bots_limit ?? 1} bot tối
                  đa
                </p>
                {workspaceWallet != null && (
                  <div className="mt-2">
                    <span className="inline-block rounded-full border border-border bg-muted/60 px-3 py-0.5 text-xs font-medium text-muted-foreground">
                      Credits: {workspaceCreditSummary?.subscriptionCredits ?? 0} (subscription) +{" "}
                      {workspaceCreditSummary?.paygCredits ?? 0} (PAYG)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Tabs
        value={purchaseTab}
        onValueChange={(value) => setPurchaseTab(value as PurchaseTab)}
        className="space-y-8"
      >
        <div className="flex justify-center">
          <TabsList className="inline-flex h-11 items-center justify-center rounded-xl bg-muted/60 p-1 text-muted-foreground shadow-inner">
            <TabsTrigger
              value="plans"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-6 py-2 text-xs font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Package className="h-4 w-4" />
              Gói dịch vụ
            </TabsTrigger>
            <TabsTrigger
              value="credits"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-6 py-2 text-xs font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <CreditCard className="h-4 w-4" />
              Nạp Credits
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="plans" className="mt-0 space-y-8">
          <section className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">Gói dịch vụ</h2>
              <p className="mt-2 text-muted-foreground">
                Chọn gói phù hợp với nhu cầu chatbot và credit hàng tháng.
              </p>
            </div>

            <div className="flex justify-center">
              <PricingToggle billingCycle={billingCycle} setBillingCycle={setBillingCycle} />
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
              {activePlans.map((plan) => {
                const isEnterprise = plan.code === ESubscriptionPlan.Enterprise;
                const features = isEnterprise
                  ? (planFeatures.dashboard[plan.code] ?? [])
                  : [
                      `${plan.monthly_credits.toLocaleString()} credits/tháng`,
                      `${plan.bots_limit} chatbot`,
                      ...(planFeatures.dashboard[plan.code] ?? []),
                    ];

                const { isCurrentPlan, isDowngrade, isUpgrade } = comparePlans(
                  currentPlan?.code ?? ESubscriptionPlan.Free,
                  plan.code,
                  planOrder
                );

                const isPaidPlan = currentPlan?.code && currentPlan.code !== ESubscriptionPlan.Free;
                const isYearlyToMonthly =
                  currentSubscription?.billing_cycle === ESubscriptionCycle.Yearly &&
                  billingCycle === ESubscriptionCycle.Monthly;
                const isSamePlanDifferentCycle =
                  isCurrentPlan && currentSubscription?.billing_cycle !== billingCycle;
                const isRenewBlocked = isCurrentPlan && hasQueuedCycle;

                const isBlocked = isEnterprise
                  ? false
                  : isDowngrade ||
                    (isPaidPlan && isYearlyToMonthly) ||
                    isSamePlanDifferentCycle ||
                    isRenewBlocked ||
                    plan.code === ESubscriptionPlan.Free;

                const isPopular = plan.code === ESubscriptionPlan.Standard && !isCurrentPlan;
                const isHighlighted = initialPlanCode === plan.code;

                let cta = planCTA.dashboard[plan.code] ?? "Chọn gói";
                if (isEnterprise) {
                  cta = isCurrentPlan ? "Thay đổi / Gia hạn gói" : "Cấu hình gói";
                } else if (isCurrentPlan) {
                  if (isSamePlanDifferentCycle) {
                    cta = "Sai chu kỳ gia hạn";
                  } else if (hasQueuedCycle) {
                    cta = "Đã có sẵn chu kỳ tiếp";
                  } else {
                    cta = "Gia hạn gói";
                  }
                } else if (isDowngrade) {
                  cta = "Chờ hết hạn để hạ cấp";
                } else if (isPaidPlan && isUpgrade) {
                  cta = isYearlyToMonthly ? "Không hỗ trợ nâng xuống Tháng" : "Nâng cấp";
                }

                return (
                  <PricingCard
                    key={plan.id}
                    variant="dashboard"
                    plan={plan}
                    features={features}
                    ctaText={cta}
                    billingCycle={billingCycle}
                    onAction={() => handleChangePlan(plan.code)}
                    isDisabled={isBlocked}
                    isLoading={processingPlan === plan.code}
                    isPopular={isPopular}
                    isCurrentPlan={isCurrentPlan}
                    isHighlighted={isHighlighted}
                  />
                );
              })}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="credits" className="mt-0">
          <section>
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-foreground">Nạp Credit - Pay-as-you-go</h2>
              <p className="mt-2 text-muted-foreground">
                Cần thêm credit nhưng không muốn đổi gói? Mua lẻ credit không giới hạn thời gian sử
                dụng.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {creditPackages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="relative overflow-hidden border-primary/20 bg-card transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-semibold text-foreground">{pkg.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-primary">
                        {formatVND((pkg.price as { VND?: number })?.VND)}
                      </span>
                      <span className="text-primary">đ</span>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-foreground">
                          +{pkg.credits_amount.toLocaleString()} credits
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Không hết hạn</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Cộng dồn tự động</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push(`/dashboard/credits/checkout?packageId=${pkg.id}`)}
                      className="mt-6 w-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                      variant="ghost"
                    >
                      Mua gói này
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>
      <div className="mt-12 text-center">
        <p className="text-muted-foreground">
          Có câu hỏi?{" "}
          <a href="mailto:contact@vielora.vn" className="text-primary hover:underline">
            Liên hệ support
          </a>
        </p>
      </div>
    </div>
  );
}
