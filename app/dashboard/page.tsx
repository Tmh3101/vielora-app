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
    console.error("[DashboardPage] Redirecting to /auth. Reason:", { userError, user: !!user });
    redirect("/auth");
  }

  const bots = await getBotsByUserId(supabase, user.id);

  const indexedPagesByBot =
    bots.length > 0
      ? await getIndexedPageCountsByBotIds(
          supabase,
          bots.map((b) => b.id)
        )
      : {};

  const subscription = await getSubscriptionByUserId(supabase, user.id);

  let plan = null;
  let creditSummary = null;
  let messagesThisMonth = 0;

  if (subscription?.plan_id) {
    plan = await getPlanById(supabase, subscription.plan_id);
    creditSummary = await getCreditSummary(supabase, user.id);
    messagesThisMonth = creditSummary?.messageCreditsUsedThisMonth ?? 0;
  }

  const totalConversations =
    bots.length > 0
      ? await getTotalConversationCount(
          supabase,
          bots.map((b) => b.id)
        )
      : 0;

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
