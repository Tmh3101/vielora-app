import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  LOCAL_ROOT,
  PRODUCTION_ROOT,
  getRootDomain,
  RESERVED_SUBDOMAINS as RESERVED_SUBDOMAINS_LIST,
  RESERVED_PATHS,
} from "@/config";
import { createServerClient } from "@supabase/ssr";
import { getDeviceType } from "@/lib/utils/device-type";
import { createAdminClient } from "@/lib/supabase/server";

const SHOPIFY_FRAME_ANCESTORS_CSP =
  "frame-ancestors https://admin.shopify.com https://*.myshopify.com;";
const RESERVED_SUBDOMAINS = new Set<string>(RESERVED_SUBDOMAINS_LIST);

interface WorkspaceCacheEntry {
  workspaceId: string | null;
  expiresAt: number;
}
const workspaceSlugCache = new Map<string, WorkspaceCacheEntry>();
const WORKSPACE_CACHE_TTL_MS = 60 * 1000;
const NEGATIVE_CACHE_TTL_MS = 15 * 1000;

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
    pathname.startsWith("/auth") ||
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
  return process.env.NODE_ENV === "production" ? getRootDomain() : `${LOCAL_ROOT}:3000`;
}

function getSubdomainForRoot(hostname: string, rootDomain: string): string | null {
  if (hostname === rootDomain) {
    return null;
  }

  if (!hostname.endsWith(`.${rootDomain}`)) {
    return null;
  }

  const subdomain = hostname.slice(0, -(rootDomain.length + 1)).trim();
  return subdomain.length > 0 ? subdomain : null;
}

function getSubdomain(request: NextRequest): string | null {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const hostname = getHostname(host);
  const rootDomain = getMainDomain();

  if (process.env.NODE_ENV === "production") {
    return getSubdomainForRoot(hostname, rootDomain);
  }

  if (hostname.endsWith(`.${LOCAL_ROOT}`)) {
    const subdomain = hostname.slice(0, -(LOCAL_ROOT.length + 1)).trim();
    return subdomain.length > 0 ? subdomain : null;
  }

  if (hostname.includes(".localhost")) {
    const subdomain = hostname.split(".localhost")[0]?.trim();
    return subdomain && subdomain.length > 0 ? subdomain : null;
  }

  return null;
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const subdomain = getSubdomain(request);
  const requestHeaders = buildRequestHeaders(request);

  if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
    if (pathname === "/" || pathname === "") {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/public-bot/${subdomain}`;
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

  // Workspace path-based routing detection with in-memory caching
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && !RESERVED_PATHS.has(firstSegment) && SLUG_PATTERN.test(firstSegment)) {
    try {
      const now = Date.now();
      const cached = workspaceSlugCache.get(firstSegment);
      let workspaceId: string | null = null;

      if (cached && cached.expiresAt > now) {
        workspaceId = cached.workspaceId;
      } else {
        const supabase = createAdminClient();
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id, slug")
          .eq("slug", firstSegment)
          .maybeSingle();

        workspaceId = workspace?.id ?? null;
        workspaceSlugCache.set(firstSegment, {
          workspaceId,
          expiresAt: now + (workspaceId ? WORKSPACE_CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
        });
      }

      if (workspaceId) {
        const remainingSegments = segments.slice(1);
        const remainingPath = remainingSegments.length > 0 ? `/${remainingSegments.join("/")}` : "";
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/dashboard${remainingPath}`;

        requestHeaders.set("x-workspace-id", workspaceId);

        const response = NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        });

        response.cookies.set("active_workspace_id", workspaceId, {
          path: "/",
          maxAge: 2592000,
          sameSite: "lax",
        });

        response.headers.set("x-workspace-id", workspaceId);

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

  const botSlug = subdomain;

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
