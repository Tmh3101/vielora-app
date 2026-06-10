"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/lib/supabase/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSubscriptionByUserId } from "@/lib/services/subscription.service";
import { getActivePlans } from "@/lib/services/plan.service";
import { planCTA, planFeatures, planOrder } from "@/config/pricing";
import { comparePlans } from "@/lib/utils/pricing";
import { PricingToggle } from "@/components/shared/pricing/PricingToggle";
import { PricingCard } from "@/components/shared/pricing/PricingCard";
import { ESubscriptionCycle, ESubscriptionPlan } from "@/types";

const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState<ESubscriptionCycle>(ESubscriptionCycle.Monthly);
  const [plans, setPlans] = useState<Tables<"plans">[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // const [subscription, setSubscription] = useState<Tables<"subscriptions"> | null>(null);
  const [activePlanCode, setActivePlanCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlansAndSub = async () => {
      try {
        // Fetch plans
        const plansData = await getActivePlans(supabase);
        setPlans(plansData);

        // Fetch User Subscription if logged in
        if (user) {
          const subData = await getSubscriptionByUserId(supabase, user.id);
          if (subData) {
            const activePlan = plansData.find((p) => p.id === subData.plan_id);
            if (activePlan) {
              setActivePlanCode(activePlan.code);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingPlans(false);
      }
    };
    if (!authLoading) {
      fetchPlansAndSub();
    }
  }, [user, authLoading, supabase]);

  const handleSelectPlan = (planCode: string) => {
    if (planCode === ESubscriptionPlan.Free) {
      router.push("/auth?mode=signup");
      return;
    }

    const target = `/dashboard/upgrade?plan=${planCode}&cycle=${billingCycle}`;
    if (!authLoading && user) {
      router.push(target);
    } else {
      router.push(`/auth?mode=signup`);
    }
  };

  return (
    <section id="pricing" className="relative scroll-mt-32 overflow-x-clip py-20 lg:py-32">
      {/* Background decorations */}
      <div className="grid-pattern absolute inset-0 opacity-30" />
      <div className="orb orb-primary -top-48 left-1/4 h-96 w-96 opacity-30" />
      <div className="orb orb-accent -bottom-36 right-1/4 h-72 w-72 opacity-30" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="heading-premium mb-4 text-3xl font-bold text-foreground sm:text-4xl"
          >
            Bảng giá <span className="text-gradient-animated">Vielora</span> SaaS - Chatbot AI
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Giải pháp tự động hóa CSKH tối ưu chi phí cho mọi quy mô doanh nghiệp
          </motion.p>
        </div>

        {/* Billing cycle toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-2 flex justify-center"
        >
          <PricingToggle
            billingCycle={billingCycle}
            setBillingCycle={setBillingCycle}
            variant="landing"
          />
        </motion.div>

        {/* Plans grid */}
        <div className="mx-auto grid max-w-5xl gap-6 pt-5 md:grid-cols-3 lg:gap-8">
          {isLoadingPlans
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass h-[420px] animate-pulse rounded-3xl p-8" />
              ))
            : plans.map((plan, index) => {
                // Dynamically prepend DB values to static features
                const features = [
                  `${plan.monthly_credits.toLocaleString()} credits/tháng`,
                  `${plan.bots_limit} chatbot`,
                  ...(planFeatures.landing[plan.code] ?? []),
                ];

                const { isCurrentPlan, isDowngrade, isUpgrade } = comparePlans(
                  activePlanCode,
                  plan.code,
                  planOrder
                );

                const isPaidPlan = activePlanCode && activePlanCode !== ESubscriptionPlan.Free;
                const isBlocked = isCurrentPlan || isDowngrade || (isPaidPlan && isUpgrade);

                const isPopular = plan.code === ESubscriptionPlan.Standard && !isCurrentPlan;

                let cta = planCTA.landing[plan.code] ?? "Chọn gói";
                if (isCurrentPlan) cta = "Gói hiện tại";
                else if (isDowngrade) cta = "Hạ cấp";
                else if (isPaidPlan && isUpgrade) cta = "Liên hệ hỗ trợ";

                return (
                  <PricingCard
                    key={plan.id}
                    variant="landing"
                    plan={plan}
                    features={features}
                    ctaText={cta}
                    billingCycle={billingCycle}
                    onAction={() => handleSelectPlan(plan.code)}
                    isDisabled={isBlocked}
                    isLoading={false}
                    isPopular={isPopular}
                    animationDelay={index * 0.1}
                  />
                );
              })}
        </div>

        {/* Policies section */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto mt-20 max-w-4xl"
        >
          <h3 className="mb-8 text-center text-2xl font-bold text-foreground">
            Chính sách dịch vụ
          </h3>
          <PricingPolicies variant="landing" />
        </motion.div> */}

        {/* FAQ link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground">
            Có câu hỏi?{" "}
            <a
              href="mailto:contact@titops.com"
              className="link-underline text-primary hover:underline"
            >
              liên hệ chúng tôi
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
