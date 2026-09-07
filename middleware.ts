import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
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
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_MAX_AGE,
} from "@/lib/constants/workspace";

const intlMiddleware = createIntlMiddleware(routing);

const SHOPIFY_FRAME_ANCESTORS_CSP =
  "frame-ancestors https://admin.shopify.com https://*.myshopify.com;";
const RESERVED_SUBDOMAINS = new Set<string>(RESERVED_SUBDOMAINS_LIST);

const PUBLIC_I18N_PATHS = new Set(["/", "/about-us", "/posts", "/privacy", "/terms"]);

function isPublicI18nPath(pathname: string): boolean {
  const localePattern = new RegExp(`^\\/(?:${routing.locales.join("|")})(?=\\/|$)`);
  const normalizedPath = pathname.replace(localePattern, "") || "/";
  const trimmedPath =
    normalizedPath.length > 1 && normalizedPath.endsWith("/")
      ? normalizedPath.slice(0, -1)
      : normalizedPath;

  if (PUBLIC_I18N_PATHS.has(trimmedPath)) return true;
  if (trimmedPath.startsWith("/posts/")) return true;
  return false;
}

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

function withShopifyCsp(response: NextResponse, pathname?: string): NextResponse {
  response.headers.set("Content-Security-Policy", SHOPIFY_FRAME_ANCESTORS_CSP);
  if (pathname) response.headers.set("x-pathname", pathname);
  return response;
}

function buildRequestHeaders(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-device-type", getDeviceType(request.headers.get("user-agent") ?? ""));
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
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
        NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } }),
        pathname
      );
    }
  }

  const localePattern = new RegExp(`^\\/(?:${routing.locales.join("|")})(?=\\/|$)`);
  if (!subdomain && localePattern.test(pathname)) {
    if (isPublicI18nPath(pathname)) {
      const intlResponse = intlMiddleware(request);
      if (intlResponse) {
        intlResponse.headers.set("x-pathname", pathname);
        return withShopifyCsp(intlResponse, pathname);
      }
    } else {
      const strippedPath = pathname.replace(localePattern, "") || "/";
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = strippedPath;
      const redirectResponse = NextResponse.redirect(redirectUrl);
      redirectResponse.headers.set("x-pathname", pathname);
      return withShopifyCsp(redirectResponse, pathname);
    }
  }

  if (!subdomain && isPublicI18nPath(pathname)) {
    const intlResponse = intlMiddleware(request);
    if (intlResponse) {
      intlResponse.headers.set("x-pathname", pathname);
      return withShopifyCsp(intlResponse, pathname);
    }
  }

  if (isExcludedPath(pathname)) {
    return withShopifyCsp(NextResponse.next({ request: { headers: requestHeaders } }), pathname);
  }

  if (pathname.startsWith("/api/shopify") || pathname.startsWith("/shopify")) {
    return withShopifyCsp(NextResponse.next({ request: { headers: requestHeaders } }), pathname);
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

        response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
          path: "/",
          maxAge: ACTIVE_WORKSPACE_COOKIE_MAX_AGE,
          sameSite: "lax",
        });

        response.headers.set("x-workspace-id", workspaceId);
        response.headers.set("x-pathname", pathname);

        return withShopifyCsp(response, pathname);
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
        const activeWorkspaceId = request.cookies.get(ACTIVE_WORKSPACE_COOKIE)?.value;

        if (activeWorkspaceId) {
          const supabase = createAdminClient();

          // Validate workspace ownership: check if user is a member
          const { data: membership } = await (supabase as ReturnType<typeof createAdminClient>)
            .from("workspace_members")
            .select("workspace_id")
            .eq("workspace_id", activeWorkspaceId)
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (membership) {
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

              const redirectResponse = NextResponse.redirect(redirectUrl, 308);
              redirectResponse.headers.set("x-pathname", pathname);
              return withShopifyCsp(redirectResponse, pathname);
            }
          } else {
            // Cookie points to a workspace the user doesn't belong to (stale from previous login).
            // Clear the cookie and fall through to find the user's own workspace.
            const response = NextResponse.next({ request: { headers: requestHeaders } });
            response.cookies.set(ACTIVE_WORKSPACE_COOKIE, "", {
              path: "/",
              maxAge: 0,
              sameSite: "lax",
            });
            // Don't return — let the page load and WorkspaceProvider will pick the correct workspace.
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
      NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } }),
      pathname
    );
  }

  const devBotSlug = process.env.DEV_BOT_SLUG;

  if (devBotSlug && pathname === "/") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/public-bot/${devBotSlug}`;
    return withShopifyCsp(
      NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } }),
      pathname
    );
  }

  return withShopifyCsp(NextResponse.next({ request: { headers: requestHeaders } }), pathname);
}

export const config = {
  matcher: [
    "/((?!_next|api|static|.*\\..*).*)",
    "/apple-touch-icon.png",
    "/apple-touch-icon-precomposed.png",
  ],
};
