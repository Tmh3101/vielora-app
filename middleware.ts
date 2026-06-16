import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  LOCAL_ROOT,
  PRODUCTION_ROOT,
  RESERVED_SUBDOMAINS as RESERVED_SUBDOMAINS_LIST,
} from "@/config";
import { getDeviceType } from "@/lib/utils/device-type";

const SHOPIFY_FRAME_ANCESTORS_CSP =
  "frame-ancestors https://admin.shopify.com https://*.myshopify.com;";
const RESERVED_SUBDOMAINS = new Set<string>(RESERVED_SUBDOMAINS_LIST);

function hasFileExtension(pathname: string): boolean {
  const lastSegment = pathname.split("/").pop() ?? "";
  return /\.[a-zA-Z0-9]+$/.test(lastSegment);
}

function isExcludedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/public-bot") ||
    hasFileExtension(pathname)
  );
}

function withShopifyCsp(response: NextResponse): NextResponse {
  response.headers.set("Content-Security-Policy", SHOPIFY_FRAME_ANCESTORS_CSP);
  return response;
}

function buildRequestHeaders(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-device-type", getDeviceType(request.headers.get("user-agent") ?? ""));
  return requestHeaders;
}

function getHostname(host: string | null): string {
  return (host ?? "").split(":")[0].toLowerCase();
}

function getMainDomain(): string {
  return process.env.NODE_ENV === "production" ? PRODUCTION_ROOT : `${LOCAL_ROOT}:3000`;
}

function getSubdomainForRoot(hostname: string, rootDomain: string): string | null {
  if (hostname === rootDomain) {
    return null;
  }

  if (!hostname.endsWith(`.${rootDomain}`)) {
    return null;
  }

  const subdomain = hostname.slice(0, -rootDomain.length - 1);
  if (!subdomain || subdomain.includes(".") || RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  return subdomain;
}

function getBotSubdomain(host: string | null): string | null {
  const hostname = getHostname(host);
  return (
    getSubdomainForRoot(hostname, LOCAL_ROOT) ?? getSubdomainForRoot(hostname, PRODUCTION_ROOT)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const mainDomain = getMainDomain();
  const requestHeaders = buildRequestHeaders(request);

  if (host === mainDomain && pathname.startsWith("/chat/")) {
    const slug = pathname.split("/")[2];

    if (slug) {
      const protocol = process.env.NODE_ENV === "production" ? "https://" : "http://";
      const redirectUrl = new URL(`${protocol}${slug}.${mainDomain}/`, request.url);
      redirectUrl.search = request.nextUrl.search;
      return withShopifyCsp(NextResponse.redirect(redirectUrl, 301));
    }
  }

  if (pathname === "/apple-touch-icon.png" || pathname === "/apple-touch-icon-precomposed.png") {
    const botSlug = getBotSubdomain(host);

    if (botSlug) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/public-bot/${botSlug}/apple-touch-icon.png`;
      return withShopifyCsp(
        NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
      );
    }
  }

  if (isExcludedPath(pathname)) {
    return withShopifyCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  if (pathname.startsWith("/api/shopify") || pathname.startsWith("/shopify")) {
    return withShopifyCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  const botSlug = getBotSubdomain(host);

  if (botSlug) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/public-bot/${botSlug}${pathname === "/" ? "" : pathname}`;
    return withShopifyCsp(
      NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    );
  }

  return withShopifyCsp(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    "/((?!_next|api|static|.*\\..*).*)",
    "/apple-touch-icon.png",
    "/apple-touch-icon-precomposed.png",
  ],
};
