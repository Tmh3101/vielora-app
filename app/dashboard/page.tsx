import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
import { getBotsByUserId } from "@/lib/services/bot.service";
import { getIndexedPageCountsByBotIds } from "@/lib/services/page.service";
import { getSubscriptionByUserId } from "@/lib/services/subscription.service";
import { getPlanById } from "@/lib/services/plan.service";
import { getCreditSummary } from "@/lib/services/credit.service";
import { getTotalConversationCount } from "@/lib/services/conversations.service";
import { DashboardClient } from "@/components/dashboard/overview/DashboardClient";
import type { DashboardInitialData } from "@/hooks/dashboard/main/useDashboardData";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const [bots, subscription] = await Promise.all([
    getBotsByUserId(supabase, user.id),
    getSubscriptionByUserId(supabase, user.id),
  ]);

  const botIds = bots.map((b) => b.id);
  const planId = subscription?.plan_id;

  const [indexedPagesByBot, totalConversations, plan, creditSummary] = await Promise.all([
    bots.length > 0 ? getIndexedPageCountsByBotIds(supabase, botIds) : Promise.resolve({}),
    bots.length > 0 ? getTotalConversationCount(supabase, botIds) : Promise.resolve(0),
    planId ? getPlanById(supabase, planId) : Promise.resolve(null),
    planId ? getCreditSummary(supabase, user.id) : Promise.resolve(null),
  ]);

  const messagesThisMonth = creditSummary?.messageCreditsUsedThisMonth ?? 0;

  const initialData: DashboardInitialData = {
    bots,
    subscription,
    plan,
    creditSummary,
    messagesThisMonth,
    totalConversations,
    indexedPagesByBot,
  };

  return <DashboardClient initialData={initialData} />;
}
