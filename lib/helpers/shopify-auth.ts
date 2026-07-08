import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type ShopifyAuthSuccess = {
  success: true;
  userId: string;
  shopDomain: string;
};

type ShopifyAuthFailure = {
  success: false;
  error: string;
};

type ShopifyAuthResult = ShopifyAuthSuccess | ShopifyAuthFailure;

export function normalizeShopDomain(dest: string) {
  const parsed = new URL(dest);

  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".myshopify.com")) {
    throw new Error("Invalid Shopify destination");
  }

  return parsed.hostname.toLowerCase();
}

export function toShopifyEmail(shopDomain: string) {
  const localPart = shopDomain.replace(/[^a-z0-9.-]/gi, "-");
  return `shopify+${localPart}@vielora.local`;
}

export async function findShopifyUserIdByEmail(email: string) {
  const adminSupabase = createAdminClient();
  const perPage = 1000;
  let page = 1;
  let hasMoreUsers = true;

  while (hasMoreUsers) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const mappedUser = users.find((user) => user.email?.toLowerCase() === email);

    if (mappedUser) {
      return mappedUser.id;
    }

    if (users.length < perPage) {
      hasMoreUsers = false;
    } else {
      page += 1;
    }
  }

  return null;
}

export async function authenticateShopifyRequest(request: NextRequest): Promise<ShopifyAuthResult> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { success: false, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.substring(7);

  try {
    const { shopify } = await import("@/lib/shopify");
    const payload = await shopify.session.decodeSessionToken(token);

    if (!payload?.dest || typeof payload.dest !== "string") {
      return { success: false, error: "Invalid token payload: missing destination" };
    }

    const shopDomain = normalizeShopDomain(payload.dest);
    const email = toShopifyEmail(shopDomain);
    const userId = await findShopifyUserIdByEmail(email);

    if (!userId) {
      return { success: false, error: "Merchant organization not found inside Supabase" };
    }

    return { success: true, userId, shopDomain };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Authentication failed" };
  }
}

export function manualReauthHtml(url: string): string {
  const safeUrl = JSON.stringify(url);
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Reconnect Shopify</title></head><body style="font-family:system-ui,-apple-system,sans-serif;padding:24px"><h1 style="margin:0 0 8px;font-size:20px">Reconnect Shopify</h1><p style="margin:0 0 16px;color:#475569">Your session needs to be re-authorized. Continue in top-level Shopify context.</p><button id="continue" style="background:#111827;color:#fff;border:0;border-radius:8px;padding:10px 14px;cursor:pointer">Continue</button><script>(function(){var u=${safeUrl};var b=document.getElementById("continue");if(b){b.addEventListener("click",function(){try{window.top.location.href=u}catch(e){window.location.href=u}})}})();</script></body></html>`;
}

export function getCallbackErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      code: "UnknownError",
      message: "Unknown Shopify callback error",
    };
  }

  return {
    code: error.name || error.constructor.name || "CallbackError",
    message: error.message.slice(0, 240),
  };
}

export function buildManagedPassword(shopDomain: string) {
  const secret = process.env.SHOPIFY_SSO_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    throw new Error("Missing SHOPIFY_SSO_SECRET or SHOPIFY_CLIENT_SECRET");
  }
  const digest = createHmac("sha256", secret).update(shopDomain).digest("hex");
  return `Vielora_${digest.slice(0, 56)}`;
}
