import { NextRequest, NextResponse } from "next/server";
import { shopify, getSessionStorage, buildEmbeddedAdminAppUrl } from "@/lib/shopify";

export const dynamic = "force-dynamic";

function getCallbackErrorDetails(error: unknown) {
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

/**
 * Handles the Shopify OAuth callback.
 * Validates the callback, exchanges the code for an access token,
 * and stores the session in Supabase.
 *
 * @param {NextRequest} request - The incoming Next.js request from Shopify.
 * @returns {Promise<NextResponse>} - Redirect to the embedded app UI.
 */
export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get("shop");
  const host = request.nextUrl.searchParams.get("host");

  try {
    console.log("Processing Shopify OAuth callback");

    const { session, headers } = await shopify.auth.callback({
      rawRequest: request,
    });

    if (session) {
      console.log(`OAuth successful for shop: ${session.shop}`);
      const sessionStorage = getSessionStorage();
      await sessionStorage.storeSession(session);
    }

    if (!host || !shop) {
      throw new Error("Missing host or shop in callback parameters");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const embeddedEntryPath = new URL("/shopify/dashboard", baseUrl);
    embeddedEntryPath.searchParams.set("host", host);
    embeddedEntryPath.searchParams.set("shop", shop);
    embeddedEntryPath.searchParams.set("embedded", "1");

    const adminAppUrl = new URL(buildEmbeddedAdminAppUrl(host));
    adminAppUrl.searchParams.set("shop", shop);
    adminAppUrl.searchParams.set("host", host);
    adminAppUrl.searchParams.set("embedded", "1");
    adminAppUrl.searchParams.set(
      "return_to",
      embeddedEntryPath.pathname + embeddedEntryPath.search
    );

    const redirectResponse = NextResponse.redirect(adminAppUrl.toString());
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => {
            if (typeof v === "string") redirectResponse.headers.append(key, v);
          });
        } else if (typeof value === "string") {
          redirectResponse.headers.append(key, value);
        }
      });
    }

    return redirectResponse;
  } catch (error) {
    const errorDetails = getCallbackErrorDetails(error);
    console.error("Shopify callback error:", {
      ...errorDetails,
      shop,
      host,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const dashboardUrl = new URL("/shopify/dashboard", appUrl);
    dashboardUrl.searchParams.set("auth_error", "callback_failed");
    dashboardUrl.searchParams.set("auth_error_code", errorDetails.code);
    dashboardUrl.searchParams.set("auth_error_message", errorDetails.message);
    if (shop) dashboardUrl.searchParams.set("shop", shop);
    if (host) dashboardUrl.searchParams.set("host", host);
    return NextResponse.redirect(dashboardUrl);
  }
}
