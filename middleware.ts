import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  LOCAL_ROOT,
  PRODUCTION_ROOT,
  RESERVED_SUBDOMAINS as RESERVED_SUBDOMAINS_LIST,
  RESERVED_PATHS,
} from "@/config";
import { createServerClient } from "@supabase/ssr";
import { getDeviceType } from "@/lib/utils/device-type";
import { createAdminClient } from "@/lib/supabase/server";

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

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

function isValidBotSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 48) return false;
  return SLUG_PATTERN.test(slug);
}

function getBotSubdomain(host: string | null): string | null {
  const hostname = getHostname(host);
  const slug =
    getSubdomainForRoot(hostname, LOCAL_ROOT) ?? getSubdomainForRoot(hostname, PRODUCTION_ROOT);
  if (slug && !isValidBotSlug(slug)) return null;
  return slug;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const mainDomain = getMainDomain();
  const requestHeaders = buildRequestHeaders(request);

  if (
    process.env.NODE_ENV === "production" &&
    host === mainDomain &&
    pathname.startsWith("/chat/")
  ) {
    const slug = pathname.split("/")[2];

    if (slug) {
      const redirectUrl = new URL(`https://${slug}.${mainDomain}/`, request.url);
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

  // Workspace path-based routing detection
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && !RESERVED_PATHS.has(firstSegment) && SLUG_PATTERN.test(firstSegment)) {
    try {
      const supabase = createAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: workspace } = await (supabase as any)
        .from("workspaces")
        .select("id, slug")
        .eq("slug", firstSegment)
        .maybeSingle();

      if (workspace) {
        const remainingSegments = segments.slice(1);
        const remainingPath = remainingSegments.length > 0 ? `/${remainingSegments.join("/")}` : "";
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/dashboard${remainingPath}`;

        requestHeaders.set("x-workspace-id", workspace.id);

        const response = NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        });

        response.cookies.set("active_workspace_id", workspace.id, {
          path: "/",
          maxAge: 2592000,
          sameSite: "lax",
        });

        response.headers.set("x-workspace-id", workspace.id);

        return withShopifyCsp(response);
      }
    } catch {
      // Workspace lookup error; fall through to bot subdomain logic
    }
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    try {
      const supabaseAuth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll() {},
          },
        }
      );
      const {
        data: { session },
      } = await supabaseAuth.auth.getSession();

      if (session) {
        const activeWorkspaceId = request.cookies.get("active_workspace_id")?.value;

        if (activeWorkspaceId) {
          const supabase = createAdminClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: workspace } = await (supabase as any)
            .from("workspaces")
            .select("slug")
            .eq("id", activeWorkspaceId)
            .maybeSingle();

          if (workspace?.slug) {
            const remainingPath = pathname.slice("/dashboard".length);
            const redirectUrl = request.nextUrl.clone();
            redirectUrl.pathname = `/${workspace.slug}${remainingPath}`;

            return withShopifyCsp(NextResponse.redirect(redirectUrl, 308));
          }
        }
      }
    } catch {
      // Auth or workspace lookup error; pass through
    }
  }

  const botSlug = getBotSubdomain(host);

  if (botSlug) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/public-bot/${botSlug}${pathname === "/" ? "" : pathname}`;
    return withShopifyCsp(
      NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    );
  }

  const devBotSlug = process.env.DEV_BOT_SLUG;

  if (devBotSlug && pathname === "/") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/public-bot/${devBotSlug}`;
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
