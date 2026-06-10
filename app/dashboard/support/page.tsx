import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSubscriptionByUserIdServerFull } from "@/lib/services/subscription.service";
import { getPlanByIdServer } from "@/lib/services/plan.service";
import SupportClient from "@/components/dashboard/support/SupportClient";
import type { ServiceClient } from "@/lib/services/types";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const supabase = await createServerClient();
  const dbClient: ServiceClient = supabase;
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const subscription = await getSubscriptionByUserIdServerFull(dbClient, user.id);
  const plan = subscription?.plan_id
    ? await getPlanByIdServer(dbClient, subscription.plan_id)
    : null;

  const { data: tickets } = await dbClient
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <SupportClient
      initialUser={user}
      initialSubscription={subscription}
      initialPlan={plan}
      initialTickets={tickets || []}
    />
  );
}
