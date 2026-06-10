import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Mandatory Privacy Webhook: Customers Redact
 * This endpoint is called when a store owner requests deletion of customer data.
 * For compliance, this must return 200 OK.
 */
export async function POST(request: NextRequest) {
  const topic = request.headers.get("x-shopify-topic");
  const headerShopDomain = request.headers.get("x-shopify-shop-domain");

  try {
    const rawBody = await request.text();
    const validation = await shopify.webhooks.validate({
      rawBody,
      rawRequest: request,
    });

    if (!validation.valid) {
      console.warn(
        `[Shopify Webhook] Invalid HMAC signature for topic=${topic} shop=${headerShopDomain}`
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      shop_domain?: string;
      customer?: { id?: string | number };
    };
    const shopDomain = (payload.shop_domain || headerShopDomain || "").toLowerCase();
    const customerId = payload.customer?.id;

    if (!shopDomain || !customerId) {
      console.warn(
        `[Shopify Webhook] Missing shop_domain/customer.id for customers-redact topic=${topic}`
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    console.log(
      `[Shopify Webhook] Processing customers-redact for shop=${shopDomain} customer=${customerId}`
    );

    const admin = createAdminClient();
    const usersResult = await admin.auth.admin.listUsers();
    if (usersResult.error) throw usersResult.error;

    const users = (usersResult.data?.users ?? []) as Array<{
      id: string;
      user_metadata?: Record<string, unknown> | null;
    }>;
    const mappedUser = users.find((user) => {
      const metadataDomain = user.user_metadata?.shop_domain;
      return typeof metadataDomain === "string" && metadataDomain.toLowerCase() === shopDomain;
    });

    if (!mappedUser) {
      console.log(`[Shopify Webhook] No mapped merchant user found for shop=${shopDomain}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const botsResult = await admin.from("bots").select("id").eq("user_id", mappedUser.id);
    if (botsResult.error) throw botsResult.error;
    const botIds = (botsResult.data ?? []).map((bot) => bot.id);

    if (botIds.length === 0) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const visitorCandidates = [
      String(customerId),
      `gid://shopify/Customer/${customerId}`,
      `${shopDomain}:${customerId}`,
    ];

    const conversationsResult = await admin
      .from("conversations")
      .select("id")
      .in("bot_id", botIds)
      .in("visitor_id", visitorCandidates);
    if (conversationsResult.error) throw conversationsResult.error;

    const conversationIds = (conversationsResult.data ?? []).map((conversation) => conversation.id);
    if (conversationIds.length > 0) {
      const deleteMessages = await admin
        .from("messages")
        .delete()
        .in("conversation_id", conversationIds);
      if (deleteMessages.error) throw deleteMessages.error;

      const deleteConversations = await admin
        .from("conversations")
        .delete()
        .in("id", conversationIds);
      if (deleteConversations.error) throw deleteConversations.error;
    }

    const deleteUsageLogs = await admin
      .from("usage_logs")
      .delete()
      .in("bot_id", botIds)
      .in("visitor_id", visitorCandidates);
    if (deleteUsageLogs.error) throw deleteUsageLogs.error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Shopify Webhook] customers-redact processing error:", {
      topic,
      headerShopDomain,
      error,
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
