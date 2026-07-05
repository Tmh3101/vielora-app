import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";

export const dynamic = "force-dynamic";

function manualReauthHtml(url: string): string {
  const safeUrl = JSON.stringify(url);
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Reconnect Shopify</title></head><body style="font-family:system-ui,-apple-system,sans-serif;padding:24px"><h1 style="margin:0 0 8px;font-size:20px">Reconnect Shopify</h1><p style="margin:0 0 16px;color:#475569">Your session needs to be re-authorized. Continue in top-level Shopify context.</p><button id="continue" style="background:#111827;color:#fff;border:0;border-radius:8px;padding:10px 14px;cursor:pointer">Continue</button><script>(function(){var u=${safeUrl};var b=document.getElementById("continue");if(b){b.addEventListener("click",function(){try{window.top.location.href=u}catch(e){window.location.href=u}})}})();</script></body></html>`;
}

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
