import { redirect } from "next/navigation";
import UpgradeClient from "@/components/dashboard/upgrade/UpgradeClient";

export const dynamic = "force-dynamic";
import { getActivePlansServer, getPlanByIdServer } from "@/lib/services/plan.service";
import { getSubscriptionByUserIdServerFull } from "@/lib/services/subscription.service";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { ESubscriptionCycle } from "@/types";

interface UpgradePageProps {
  searchParams?: {
    plan?: string;
    cycle?: string;
  };
}

export default async function UpgradePage({ searchParams }: UpgradePageProps) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const [activePlans, currentSubscription, { data: rawCreditPackages }] = await Promise.all([
    getActivePlansServer(supabase, true),
    getSubscriptionByUserIdServerFull(supabase, user.id),
    supabase.from("credit_packages").select("*").eq("is_active", true),
  ]);

  // Sort credit packages by VND price in memory since price is now jsonb
  const sortedCreditPackages = ((rawCreditPackages as Tables<"credit_packages">[]) || []).sort(
    (a, b) => {
      const priceA = (a.price as { VND?: number })?.VND || 0;
      const priceB = (b.price as { VND?: number })?.VND || 0;
      return priceA - priceB;
    }
  );

  const currentPlan = currentSubscription?.plan_id
    ? await getPlanByIdServer(supabase, currentSubscription.plan_id)
    : null;

  const initialBillingCycle: ESubscriptionCycle =
    searchParams?.cycle === ESubscriptionCycle.Yearly
      ? ESubscriptionCycle.Yearly
      : ESubscriptionCycle.Monthly;

  return (
    <UpgradeClient
      activePlans={activePlans}
      currentSubscription={currentSubscription}
      currentPlan={currentPlan}
      initialPlanCode={searchParams?.plan ?? null}
      initialBillingCycle={initialBillingCycle}
      creditPackages={sortedCreditPackages}
    />
  );
}
