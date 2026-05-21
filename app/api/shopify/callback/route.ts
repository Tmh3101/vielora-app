import { NextRequest, NextResponse } from "next/server";
import { shopify, getSessionStorage } from "@/lib/shopify";

export const dynamic = "force-dynamic";

/**
 * Handles the Shopify OAuth callback.
 * Validates the callback, exchanges the code for an access token,
 * and stores the session in Supabase.
 *
 * @param {NextRequest} request - The incoming Next.js request from Shopify.
 * @returns {Promise<NextResponse>} - Redirect to the embedded app UI.
 */
export async function GET(request: NextRequest) {
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

    const host = request.nextUrl.searchParams.get("host");
    const shop = request.nextUrl.searchParams.get("shop");

    if (!host || !shop) {
      throw new Error("Missing host or shop in callback parameters");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const appUrl = new URL(`/shopify/dashboard`, baseUrl);

    appUrl.searchParams.set("host", host);
    appUrl.searchParams.set("shop", shop);

    const redirectResponse = NextResponse.redirect(appUrl.toString());
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
    console.error("Shopify callback error:", error);

    return NextResponse.json(
      { error: "Authentication callback failed", message: (error as Error).message },
      { status: 500 }
    );
  }
}
