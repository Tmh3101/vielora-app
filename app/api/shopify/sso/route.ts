import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { findShopifyUserIdByEmail } from "@/lib/helpers/shopify-auth";

export const dynamic = "force-dynamic";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

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

function buildManagedPassword(shopDomain: string) {
  const secret = process.env.SHOPIFY_SSO_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    throw new Error("Missing SHOPIFY_SSO_SECRET or SHOPIFY_CLIENT_SECRET");
  }
  const digest = createHmac("sha256", secret).update(shopDomain).digest("hex");
  return `Vielora_${digest.slice(0, 56)}`;
}

function getSafeReturnPath(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("return_to");
  if (!returnTo) return "/dashboard";

  if (returnTo.startsWith("/dashboard")) {
    return returnTo;
  }

  return "/dashboard";
}

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const failRedirect = new URL("/auth?error=sso_failed", appUrl);

  function redirectFailed(reason: string) {
    const redirectUrl = new URL(failRedirect);
    redirectUrl.searchParams.set("reason", reason);
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      console.error("[Shopify SSO] Missing session token in query params");
      return redirectFailed("missing_token");
    }

    const payload = await shopify.session.decodeSessionToken(token);
    if (!payload?.dest || typeof payload.dest !== "string") {
      console.error("[Shopify SSO] Invalid token payload: missing dest");
      return redirectFailed("invalid_token_payload");
    }

    const shopDomain = normalizeShopDomain(payload.dest);
    const targetEmail = toShopifyEmail(shopDomain);
    const fallbackPassword = buildManagedPassword(shopDomain);

    const supabase = await createServerClient();
    let signInResult = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: fallbackPassword,
    });

    if (signInResult.error) {
      const admin = createAdminClient();
      const created = await admin.auth.admin.createUser({
        email: targetEmail,
        password: fallbackPassword,
        email_confirm: true,
        user_metadata: {
          shop_domain: shopDomain,
          auth_provider: "shopify",
          role: "merchant",
        },
      });

      if (created.error) {
        const message = created.error.message.toLowerCase();
        const isExistingUserError =
          message.includes("already") ||
          message.includes("exists") ||
          message.includes("registered");
        if (!isExistingUserError) {
          throw created.error;
        }

        // If the user already exists, update/sync their password to the current fallbackPassword
        // to handle secret mismatches or configuration changes.
        const userId = await findShopifyUserIdByEmail(targetEmail);
        if (userId) {
          const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
            password: fallbackPassword,
          });
          if (updateError) {
            console.error("[Shopify SSO] Failed to sync user password:", updateError);
          }
        }
      }

      signInResult = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: fallbackPassword,
      });
    }

    if (signInResult.error) {
      throw signInResult.error;
    }

    return NextResponse.redirect(new URL(getSafeReturnPath(request), appUrl));
  } catch (error) {
    console.error("[Shopify SSO] Flow failed", {
      error,
      requestPath: request.nextUrl.pathname,
      hasToken: Boolean(request.nextUrl.searchParams.get("token")),
    });
    return redirectFailed(error instanceof Error ? error.name || "flow_failed" : "flow_failed");
  }
}
