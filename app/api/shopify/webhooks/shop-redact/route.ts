import { NextRequest, NextResponse } from "next/server";
import { getSessionStorage, shopify } from "@/lib/shopify";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Mandatory Privacy Webhook: Shop Redact
 * This endpoint is called when a store owner uninstalls the app,
 * requesting deletion of all shop-related data.
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
    };
    const shopDomain = (payload.shop_domain || headerShopDomain || "").toLowerCase();

    if (!shopDomain) {
      console.warn(`[Shopify Webhook] Missing shop domain in shop redact payload topic=${topic}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    console.log(`[Shopify Webhook] Processing shop redact for ${shopDomain}`);

    const admin = createAdminClient();
    const listUsersResult = await admin.auth.admin.listUsers();
    if (listUsersResult.error) throw listUsersResult.error;

    const users = (listUsersResult.data?.users ?? []) as Array<{
      id: string;
      user_metadata?: Record<string, unknown> | null;
    }>;

    const mappedUser = users.find((user) => {
      const metadataDomain = user.user_metadata?.shop_domain;
      return typeof metadataDomain === "string" && metadataDomain.toLowerCase() === shopDomain;
    });

    const sessionStorage = getSessionStorage();
    const sessions = await sessionStorage.findSessionsByShop(shopDomain);
    if (sessions.length > 0) {
      await sessionStorage.deleteSessions(sessions.map((session) => session.id));
    }

    if (!mappedUser) {
      console.log(`[Shopify Webhook] No mapped Supabase user found for shop ${shopDomain}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const userId = mappedUser.id;

    const botsResult = await admin.from("bots").select("id").eq("user_id", userId);
    if (botsResult.error) throw botsResult.error;
    const botIds = (botsResult.data ?? []).map((bot) => bot.id);

    if (botIds.length > 0) {
      const conversationsResult = await admin
        .from("conversations")
        .select("id")
        .in("bot_id", botIds);
      if (conversationsResult.error) throw conversationsResult.error;
      const conversationIds = (conversationsResult.data ?? []).map(
        (conversation) => conversation.id
      );

      if (conversationIds.length > 0) {
        const deleteMessages = await admin
          .from("messages")
          .delete()
          .in("conversation_id", conversationIds);
        if (deleteMessages.error) throw deleteMessages.error;
      }

      const botScopedDeletes = await Promise.all([
        admin.from("usage_logs").delete().in("bot_id", botIds),
        admin.from("documents").delete().in("bot_id", botIds),
        admin.from("pages").delete().in("bot_id", botIds),
        admin.from("jobs").delete().in("bot_id", botIds),
        admin.from("conversations").delete().in("bot_id", botIds),
      ]);
      botScopedDeletes.forEach((result) => {
        if (result.error) throw result.error;
      });
    }

    const userScopedDeletes = await Promise.all([
      admin.from("credit_transactions").delete().eq("user_id", userId),
      admin.from("payments").delete().eq("user_id", userId),
      admin.from("subscriptions").delete().eq("user_id", userId),
      admin.from("wallets").delete().eq("user_id", userId),
      admin.from("bots").delete().eq("user_id", userId),
    ]);
    userScopedDeletes.forEach((result) => {
      if (result.error) throw result.error;
    });

    const deleteAuthUser = await admin.auth.admin.deleteUser(userId);
    if (deleteAuthUser.error) {
      throw deleteAuthUser.error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Shopify Webhook] shop-redact processing error:", {
      topic,
      headerShopDomain,
      error,
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
