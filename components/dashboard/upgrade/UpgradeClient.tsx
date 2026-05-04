"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingToggle } from "@/components/shared/pricing/PricingToggle";
import { PricingCard } from "@/components/shared/pricing/PricingCard";
// import { PricingPolicies } from "@/components/shared/pricing/PricingPolicies";
import { planCTA, planFeatures, planOrder, type BillingCycle } from "@/config/pricing";
import { comparePlans } from "@/lib/utils/pricing";
import type { Tables } from "@/lib/supabase/types";
import { ESubscriptionPlan } from "@/types";

interface UpgradeClientProps {
  activePlans: Tables<"plans">[];
  currentSubscription: Tables<"subscriptions"> | null;
  currentPlan: Tables<"plans"> | null;
  initialPlanCode: string | null;
  initialBillingCycle: BillingCycle;
}

export default function UpgradeClient({
  activePlans,
  currentSubscription,
  currentPlan,
  initialPlanCode,
  initialBillingCycle,
}: UpgradeClientProps) {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialBillingCycle);
  const processingPlan: string | null = null;

  const handleChangePlan = (planCode: string) => {
    if (planCode === currentPlan?.code) {
      toast.info("Bạn đang sử dụng gói này");
      return;
    }

    if (planCode === "enterprise") {
      toast.info("Vui lòng liên hệ sales@vielora.vn để nâng cấp Enterprise");
      return;
    }

    if (planCode === "free") {
      toast.info("Bạn đang sử dụng gói Free");
      return;
    }

    router.push(`/dashboard/checkout?plan=${planCode}&cycle=${billingCycle}`);
  };

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
          <h1 className="mb-3 text-3xl font-bold text-foreground">Nâng cấp gói của bạn</h1>
          <p className="text-muted-foreground">
            Chọn gói thanh toán theo tháng hoặc theo năm phù hợp với nhu cầu của bạn
          </p>
        </div>

        <div className="mb-10 flex justify-center">
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

            const isPaidPlan = currentPlan?.code && currentPlan.code !== "free";
            const isBlocked = isCurrentPlan || isDowngrade || (isPaidPlan && isUpgrade);

            const isPopular = plan.code === "standard" && !isCurrentPlan;
            const isHighlighted = initialPlanCode === plan.code;

            let cta = planCTA.dashboard[plan.code] ?? "Chọn gói";
            if (isCurrentPlan) cta = "Gói hiện tại";
            else if (isDowngrade) cta = "Hạ cấp";
            else if (isPaidPlan && isUpgrade) cta = "Liên hệ nâng cấp";

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

        {/* <div className="mx-auto mt-16 max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            Chính sách dịch vụ
          </h2>
          <PricingPolicies variant="dashboard" />
        </div> */}

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Có câu hỏi?{" "}
            <a href="mailto:contact@titops.com" className="text-primary hover:underline">
              Liên hệ support
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
