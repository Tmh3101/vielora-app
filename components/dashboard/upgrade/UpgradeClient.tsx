"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Crown, Sparkles, Zap, CheckCircle2 } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="border-none hover:bg-white hover:text-primary"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </div>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo-full.png"
                alt="Vielora"
                width={120}
                height={40}
                className="h-16 w-auto"
                priority
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 sm:px-6 md:py-12 lg:px-8">
        <Card className="mb-8 border-primary/50 bg-primary/5">
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
                      <>
                        Hết hạn:{" "}
                        {new Date(currentSubscription.current_period_end).toLocaleDateString(
                          "vi-VN"
                        )}
                      </>
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

        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground">Gói Dịch Vụ & Credit</h1>
          <p className="text-muted-foreground">
            Chọn gói nâng cấp theo chu kỳ hoặc nạp lẻ credit (Pay-as-you-go)
          </p>
        </div>

        <Tabs defaultValue="subscription" className="mx-auto max-w-5xl">
          <div className="mb-10 flex justify-center">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Gói Nâng Cấp
              </TabsTrigger>
              <TabsTrigger value="payg" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Pay-as-you-go
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="subscription"
            className="mt-0 space-y-8 duration-500 animate-in fade-in-50"
          >
            <div className="flex justify-center">
              <PricingToggle billingCycle={billingCycle} setBillingCycle={setBillingCycle} />
            </div>

            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
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
          </TabsContent>

          <TabsContent value="payg" className="mt-0 duration-500 animate-in fade-in-50">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-foreground">Nạp lẻ Credit (Pay-as-you-go)</h2>
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
                    <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                    <div className="mt-4 flex flex-col gap-1">
                      <div className="flex items-baseline text-3xl font-bold text-primary">
                        {((pkg.price as { VND?: number })?.VND || 0).toLocaleString("vi-VN")}đ
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">
                        ~ ${(pkg.price as { USD?: number })?.USD || 0} USD
                      </div>
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
          </TabsContent>
        </Tabs>

        {/* <div className="mx-auto mt-16 max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            Chính sách dịch vụ
          </h2>
          <PricingPolicies variant="dashboard" />
        </div> */}

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Có câu hỏi?{" "}
            <a href="mailto:contact@vielora.vn" className="text-primary hover:underline">
              Liên hệ support
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
