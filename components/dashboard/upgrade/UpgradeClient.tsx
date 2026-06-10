"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, Crown, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PricingToggle } from "@/components/shared/pricing/PricingToggle";
import { PricingCard } from "@/components/shared/pricing/PricingCard";
import { planCTA, planFeatures, planOrder } from "@/config/pricing";
import { comparePlans } from "@/lib/utils/pricing";
import type { Tables } from "@/lib/supabase/types";
import { ESubscriptionPlan, ESubscriptionCycle } from "@/types";
import { PaymentAction } from "@/lib/constants";
import { formatPaymentDate } from "@/lib/helpers/payment-helpers";
import { formatVND } from "@/lib/utils/currency";

type PurchaseTab = "plans" | "credits";

interface UpgradeClientProps {
  activePlans: Tables<"plans">[];
  currentSubscription: Tables<"subscriptions"> | null;
  currentPlan: Tables<"plans"> | null;
  initialPlanCode: string | null;
  initialBillingCycle: ESubscriptionCycle;
  creditPackages: Tables<"credit_packages">[];
}

export default function UpgradeClient({
  activePlans,
  currentSubscription,
  currentPlan,
  initialPlanCode,
  initialBillingCycle,
  creditPackages = [],
}: UpgradeClientProps) {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<ESubscriptionCycle>(initialBillingCycle);
  const [purchaseTab, setPurchaseTab] = useState<PurchaseTab>("plans");
  const processingPlan: string | null = null;

  const handleChangePlan = (planCode: string) => {
    if (planCode === ESubscriptionPlan.Enterprise) {
      toast.info("Vui lòng liên hệ contact@vielora.vn để nâng cấp Enterprise");
      return;
    }

    if (planCode === ESubscriptionPlan.Free) {
      toast.info("Gói Free chỉ được tự động kích hoạt khi gói trả phí hết hạn");
      return;
    }

    let action = PaymentAction.Upgrade;
    if (planCode === currentPlan?.code) {
      if (currentSubscription?.billing_cycle !== billingCycle) {
        toast.error("Vui lòng chọn đúng chu kỳ để gia hạn");
        return;
      }
      action = PaymentAction.Renew;
    }

    router.push(`/dashboard/checkout?plan=${planCode}&cycle=${billingCycle}&action=${action}`);
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

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Gói hiện tại: {currentPlan?.name ?? "Free"}
                  {currentPlan?.code !== ESubscriptionPlan.Free && (
                    <Badge variant="secondary" className="ml-2 bg-primary">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Premium
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {currentSubscription?.current_period_end && (
                    <>Hết hạn: {formatPaymentDate(currentSubscription.current_period_end)}</>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm text-muted-foreground">Giới hạn hiện tại</p>
              <p className="text-sm">{currentPlan?.bots_limit ?? 1} bot tối đa</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs
        value={purchaseTab}
        onValueChange={(value) => setPurchaseTab(value as PurchaseTab)}
        className="space-y-8"
      >
        <div className="flex justify-center p-0">
          <TabsList className="glass grid h-auto w-full max-w-xl grid-cols-2">
            <TabsTrigger
              value="plans"
              className="data-[state=active]:bg-gradient-primary flex min-h-10 items-center gap-2 whitespace-normal p-0 text-center text-sm leading-snug data-[state=active]:text-primary-foreground sm:text-base"
            >
              <Package className="h-4 w-4 shrink-0" />
              Gói dịch vụ
            </TabsTrigger>
            <TabsTrigger
              value="credits"
              className="data-[state=active]:bg-gradient-primary flex min-h-10 items-center gap-2 whitespace-normal p-0 text-center text-sm leading-snug data-[state=active]:text-primary-foreground sm:text-base"
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              Nạp Credit - Pay-as-you-go
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

            <div className="grid gap-6 md:grid-cols-3">
              {activePlans.map((plan) => {
                const features = [
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

                const isBlocked =
                  isDowngrade ||
                  (isPaidPlan && isYearlyToMonthly) ||
                  isSamePlanDifferentCycle ||
                  isRenewBlocked ||
                  plan.code === ESubscriptionPlan.Free;

                const isPopular = plan.code === ESubscriptionPlan.Standard && !isCurrentPlan;
                const isHighlighted = initialPlanCode === plan.code;

                let cta = planCTA.dashboard[plan.code] ?? "Chọn gói";
                if (isCurrentPlan) {
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
                  cta = isYearlyToMonthly
                    ? "Không hỗ trợ nâng xuống Tháng"
                    : "Nâng cấp (Có bù trừ)";
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
