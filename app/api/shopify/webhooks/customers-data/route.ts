import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Mandatory Privacy Webhook: Customers Data Request
 * This endpoint is called when a customer requests their data from the store owner.
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
      customer?: { id?: string | number; email?: string | null; phone?: string | null };
      orders_requested?: Array<string | number>;
    };
    const shopDomain = (payload.shop_domain || headerShopDomain || "").toLowerCase();
    const customerId = payload.customer?.id;

    if (!shopDomain || !customerId) {
      console.warn(
        `[Shopify Webhook] Missing shop_domain/customer.id for customers-data topic=${topic}`
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

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

    const visitorCandidates = [
      String(customerId),
      `gid://shopify/Customer/${customerId}`,
      `${shopDomain}:${customerId}`,
    ];

    const conversationsResult = await admin
      .from("conversations")
      .select("id, bot_id, started_at, ended_at, visitor_id")
      .in("bot_id", botIds)
      .in("visitor_id", visitorCandidates);
    if (conversationsResult.error) throw conversationsResult.error;

    const conversations = conversationsResult.data ?? [];
    const conversationIds = conversations.map((conversation) => conversation.id);

    let messages: Array<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: string;
    }> = [];

    if (conversationIds.length > 0) {
      const messagesResult = await admin
        .from("messages")
        .select("id, conversation_id, role, content, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true });
      if (messagesResult.error) throw messagesResult.error;
      messages = messagesResult.data ?? [];
    }

    console.log("[Shopify Webhook] customers-data export prepared", {
      topic,
      shopDomain,
      customerId,
      customerEmail: payload.customer?.email ?? null,
      customerPhone: payload.customer?.phone ?? null,
      requestedOrders: payload.orders_requested ?? [],
      conversationCount: conversations.length,
      messageCount: messages.length,
      conversations,
      messages,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Shopify Webhook] customers-data processing error:", {
      topic,
      headerShopDomain,
      error,
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
