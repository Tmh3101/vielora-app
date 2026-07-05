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

function normalizeShopDomain(dest: string) {
  const parsed = new URL(dest);

  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".myshopify.com")) {
    throw new Error("Invalid Shopify destination");
  }

  return parsed.hostname.toLowerCase();
}

function toShopifyEmail(shopDomain: string) {
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
