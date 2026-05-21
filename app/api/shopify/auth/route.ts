import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  try {
    console.log(`Starting Shopify OAuth for shop: ${shop}`);

    const response = await shopify.auth.begin({
      shop,
      callbackPath: "/api/shopify/callback",
      isOnline: false,
      rawRequest: request,
    });

    const redirectUrl = response.headers.get("location");
    if (!redirectUrl) throw new Error("Missing redirect URL");

    const finalResponse = NextResponse.redirect(redirectUrl, {
      status: 302,
    });

    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      const cookiesToSet = setCookieHeader.split(/,(?=[^;]+=[^;]+)/);
      cookiesToSet.forEach((cookieStr) => {
        const parts = cookieStr.split(";")[0].split("=");
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const value = parts.slice(1).join("=").trim();

          finalResponse.headers.append(
            "Set-Cookie",
            `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=None; Partitioned`
          );
        }
      });
    }

    return finalResponse;
  } catch (error) {
    console.error("Shopify auth error:", error);
    return NextResponse.json({ error: "Authentication initiation failed" }, { status: 500 });
  }
}
