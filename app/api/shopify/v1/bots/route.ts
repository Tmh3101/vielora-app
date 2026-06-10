import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { authenticateShopifyRequest } from "@/lib/helpers/shopify-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getCreditSummary } from "@/lib/services/credit.service";
import { getTotalConversationCount } from "@/lib/services/conversations.service";
import { getIndexedPageCountsByBotIds } from "@/lib/services/page.service";
import { getPlanById } from "@/lib/services/plan.service";
import { getSubscriptionByUserId } from "@/lib/services/subscription.service";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const auth = await authenticateShopifyRequest(request);

  if (auth.success === false) {
    return NextResponse.json(
      { success: false, message: auth.error },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabase = createAdminClient();
    const { data: bots, error } = await supabase
      .from("bots")
      .select("id, name, status, domain, avatar_url, is_stopped, last_crawl_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const botList = bots ?? [];
    const botIds = botList.map((bot) => bot.id);
    const subscription = await getSubscriptionByUserId(supabase, auth.userId);
    const plan = subscription?.plan_id ? await getPlanById(supabase, subscription.plan_id) : null;
    const [indexedPagesByBot, totalConversations, creditSummary] = await Promise.all([
      botIds.length > 0 ? getIndexedPageCountsByBotIds(supabase, botIds) : Promise.resolve({}),
      botIds.length > 0 ? getTotalConversationCount(supabase, botIds) : Promise.resolve(0),
      subscription?.plan_id ? getCreditSummary(supabase, auth.userId) : Promise.resolve(null),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          bots: botList,
          stats: {
            messagesThisMonth: creditSummary?.messageCreditsUsedThisMonth ?? 0,
            totalConversations,
            botCount: botList.length,
            botsLimit: plan?.bots_limit ?? 1,
            hasSubscription: Boolean(subscription),
          },
          subscription,
          currentPlan: plan?.code ?? "free",
          creditSummary,
          indexedPagesByBot,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[Shopify API V1] Get bots failed:", error);

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
