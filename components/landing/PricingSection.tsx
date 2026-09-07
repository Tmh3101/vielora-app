"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/lib/supabase/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSubscriptionByWorkspaceId } from "@/lib/services/subscription.service";
import { getActivePlans } from "@/lib/services/plan.service";
import { planFeatureKeys, planOrder } from "@/config/pricing";
import { comparePlans } from "@/lib/utils/pricing";
import { PricingToggle } from "@/components/shared/pricing/PricingToggle";
import { PricingCard } from "@/components/shared/pricing/PricingCard";
import { ESubscriptionCycle, ESubscriptionPlan } from "@/types";
import { useWorkspace, readActiveWorkspaceIdFromCookie } from "@/hooks/useWorkspace";

const PricingSection = () => {
  const t = useTranslations("pricing");
  const [billingCycle, setBillingCycle] = useState<ESubscriptionCycle>(ESubscriptionCycle.Monthly);
  const [plans, setPlans] = useState<Tables<"plans">[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [activePlanCode, setActivePlanCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlansAndSub = async () => {
      try {
        // Fetch plans
        const plansData = await getActivePlans(supabase);
        setPlans(plansData);

        // Fetch workspace subscription if logged in
        if (user) {
          const wsId =
            activeWorkspace?.id ||
            (typeof document !== "undefined" ? readActiveWorkspaceIdFromCookie() : null);
          const subData = wsId ? await getSubscriptionByWorkspaceId(supabase, wsId) : null;
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
  }, [user, authLoading, activeWorkspace?.id, supabase]);

  const handleSelectPlan = (planCode: string) => {
    const targetSlug = activeWorkspace?.slug;
    const targetBase = targetSlug ? `/${encodeURIComponent(targetSlug)}` : "/dashboard";

    if (planCode === ESubscriptionPlan.Enterprise) {
      const enterpriseTarget = `${targetBase}/upgrade/enterprise?cycle=${billingCycle}`;
      if (!authLoading && user) {
        router.push(enterpriseTarget);
      } else {
        router.push(`/auth?mode=signup&redirect=${encodeURIComponent(enterpriseTarget)}`);
      }
      return;
    }

    if (planCode === ESubscriptionPlan.Free) {
      router.push("/auth?mode=signup");
      return;
    }

    const target = `${targetBase}/upgrade?plan=${planCode}&cycle=${billingCycle}`;
    if (!authLoading && user) {
      router.push(target);
    } else {
      router.push(`/auth?mode=signup&redirect=${encodeURIComponent(target)}`);
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
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="heading-premium mb-4 text-3xl font-bold text-foreground sm:text-4xl"
          >
            {t("title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            {t("subtitle")}
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
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-2 pt-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {isLoadingPlans
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass h-[420px] animate-pulse rounded-3xl p-8" />
              ))
            : plans.map((plan, index) => {
                // Dynamically prepend DB values to static features (except for Enterprise plan)
                const isEnterprisePlan = plan.code === ESubscriptionPlan.Enterprise;
                const staticKeys = planFeatureKeys[plan.code as keyof typeof planFeatureKeys] ?? [];
                const staticTranslated = staticKeys.map((key) =>
                  t.has(`features.${key}`) ? t(`features.${key}`) : key
                );

                const features = isEnterprisePlan
                  ? staticTranslated
                  : [
                      t("monthlyCredits", { credits: plan.monthly_credits.toLocaleString() }),
                      t("chatbotCount", { count: plan.bots_limit }),
                      ...staticTranslated,
                    ];

                const { isCurrentPlan, isDowngrade, isUpgrade } = comparePlans(
                  activePlanCode,
                  plan.code,
                  planOrder
                );

                const isBlocked = isCurrentPlan || isDowngrade;

                const isPopular = plan.code === ESubscriptionPlan.Standard && !isCurrentPlan;

                let cta = t("selectPlan");
                if (isCurrentPlan) {
                  cta = t("currentPlan");
                } else if (isDowngrade) {
                  cta = t("downgrade");
                } else if (isUpgrade) {
                  cta =
                    plan.code === ESubscriptionPlan.Enterprise
                      ? t("configureEnterprise")
                      : t("upgradeTo", { name: plan.name });
                }

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

        {/* FAQ link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground">
            {t("haveQuestions")}{" "}
            <a
              href="mailto:contact@vielora.vn"
              className="link-underline text-primary hover:underline"
            >
              {t("contactUs")}
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
