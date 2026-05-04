import { redirect } from "next/navigation";
import UpgradeClient from "@/components/dashboard/upgrade/UpgradeClient";

export const dynamic = "force-dynamic";
import { type BillingCycle } from "@/config/pricing";
import { getActivePlansServer, getPlanByIdServer } from "@/lib/services/plan.service";
import { getSubscriptionByUserIdServerFull } from "@/lib/services/subscription.service";
import { createServerClient } from "@/lib/supabase/server";

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

  const [activePlans, currentSubscription] = await Promise.all([
    getActivePlansServer(supabase, true),
    getSubscriptionByUserIdServerFull(supabase, user.id),
  ]);

  const currentPlan = currentSubscription?.plan_id
    ? await getPlanByIdServer(supabase, currentSubscription.plan_id)
    : null;

  const initialBillingCycle: BillingCycle = searchParams?.cycle === "yearly" ? "yearly" : "monthly";

  return (
    <UpgradeClient
      activePlans={activePlans}
      currentSubscription={currentSubscription}
      currentPlan={currentPlan}
      initialPlanCode={searchParams?.plan ?? null}
      initialBillingCycle={initialBillingCycle}
    />
  );
}
