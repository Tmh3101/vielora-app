import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UpgradeClient from "@/components/dashboard/upgrade/UpgradeClient";

export const dynamic = "force-dynamic";
import { getActivePlansServer, getPlanByIdServer } from "@/lib/services/plan.service";
import { getSubscriptionByWorkspaceId } from "@/lib/services/subscription.service";
import { getWorkspaceCreditSummary } from "@/lib/services/credit.service";
import { getWalletByWorkspaceId } from "@/lib/services/wallet.service";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { ESubscriptionCycle } from "@/types";

interface UpgradePageProps {
  searchParams?: {
    plan?: string;
    cycle?: string;
    slug?: string;
    workspace_id?: string;
  };
}

import { WorkspaceService } from "@/lib/services/workspace.service";

export default async function UpgradePage({ searchParams }: UpgradePageProps) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const cookieStore = await cookies();
  let workspaceId = cookieStore.get("active_workspace_id")?.value;

  const [userWorkspaces, activePlans, { data: rawCreditPackages }] = await Promise.all([
    WorkspaceService.getUserWorkspaces(user.id),
    getActivePlansServer(supabase),
    supabase.from("credit_packages").select("*").eq("is_active", true),
  ]);

  if (searchParams?.slug) {
    const matchedWs = userWorkspaces.find(
      (w: { id: string; slug: string }) => w.slug === searchParams.slug
    );
    if (matchedWs) workspaceId = matchedWs.id;
  } else if (searchParams?.workspace_id) {
    const matchedWs = userWorkspaces.find(
      (w: { id: string; slug: string }) => w.id === searchParams.workspace_id
    );
    if (matchedWs) workspaceId = matchedWs.id;
  } else if (!workspaceId && userWorkspaces.length > 0) {
    workspaceId = userWorkspaces[0].id;
  }

  const [currentSubscription, workspaceWallet, workspaceCreditSummary] = workspaceId
    ? await Promise.all([
        getSubscriptionByWorkspaceId(supabase, workspaceId),
        getWalletByWorkspaceId(supabase, workspaceId),
        getWorkspaceCreditSummary(supabase, workspaceId),
      ])
    : [null, null, null];

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

  const formattedWorkspaces = userWorkspaces.map(
    (ws: {
      id: string;
      name: string;
      slug: string;
      subscriptions?: { plans?: { name?: string; code?: string } } | null;
    }) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      planName: ws.subscriptions?.plans?.name,
      planCode: ws.subscriptions?.plans?.code,
    })
  );

  return (
    <UpgradeClient
      userWorkspaces={formattedWorkspaces}
      activePlans={activePlans}
      currentSubscription={currentSubscription}
      currentPlan={currentPlan}
      initialPlanCode={searchParams?.plan ?? null}
      initialBillingCycle={initialBillingCycle}
      creditPackages={sortedCreditPackages}
      workspaceId={workspaceId ?? null}
      workspaceWallet={workspaceWallet}
      workspaceCreditSummary={workspaceCreditSummary}
    />
  );
}
