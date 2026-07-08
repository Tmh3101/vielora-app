import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";
import { manualReauthHtml } from "@/lib/helpers/shopify-auth";

export const dynamic = "force-dynamic";

function appendOAuthCookies(source: Response, target: NextResponse) {
  const headersWithGetSetCookie = source.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookieList = headersWithGetSetCookie.getSetCookie?.();
  if (cookieList && cookieList.length > 0) {
    cookieList.forEach((cookieStr) => target.headers.append("Set-Cookie", cookieStr));
    return;
  }

  const setCookieHeader = source.headers.get("set-cookie");
  if (!setCookieHeader) return;
  setCookieHeader
    .split(/,(?=[^;]+=[^;]+)/)
    .forEach((cookieStr) => target.headers.append("Set-Cookie", cookieStr.trim()));
}

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get("shop");
  const fetchDest = request.headers.get("sec-fetch-dest");
  const shouldEscapeIframe = fetchDest === "iframe" || fetchDest === "frame";

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

    if (shouldEscapeIframe) {
      const htmlResponse = new NextResponse(manualReauthHtml(redirectUrl), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
      appendOAuthCookies(response, htmlResponse);
      return htmlResponse;
    }

    const finalResponse = NextResponse.redirect(redirectUrl, {
      status: 302,
    });
    appendOAuthCookies(response, finalResponse);

    return finalResponse;
  } catch (error) {
    console.error("Shopify auth error:", error);
    return NextResponse.json({ error: "Authentication initiation failed" }, { status: 500 });
  }
}
