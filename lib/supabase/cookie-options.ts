import { getRootDomain } from "@/config";

/**
 * Domains whose registrable suffix is on the Public Suffix List (PSL).
 * Setting cookies with a leading-dot domain that resolves to a public suffix
 * (e.g. `*.ngrok-free.dev`, `*.trycloudflare.com`, `*.loca.lt`, `*.github.io`)
 * is rejected by browsers, which silently drops the session cookie and breaks
 * OAuth login. Treat them as host-only by returning `undefined`.
 */
const TUNNEL_OR_PSL_TLDS = [
  "ngrok.io",
  "ngrok-free.dev",
  "trycloudflare.com",
  "loca.lt",
  "serveo.net",
  "github.io",
  "vercel.app",
  "share.zrok.io",
];

function isPublicSuffixDomain(hostname: string): boolean {
  const h = hostname.toLowerCase().split(":")[0];
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h.endsWith(".localhost") || h.endsWith(".local")) return true;
  return TUNNEL_OR_PSL_TLDS.some((suffix) => h === suffix || h.endsWith(`.${suffix}`));
}

/**
 * Returns the cookie domain for authentication cookies so sessions can be shared
 * seamlessly between the main application (e.g., vielora.vn) and all bot subdomains (*.vielora.vn).
 * Returns undefined for local development and for tunnel/PSL hostnames (so cookies are host-only).
 */
export function getAuthCookieDomain(): string | undefined {
  if (typeof window !== "undefined") {
    if (isPublicSuffixDomain(window.location.hostname)) {
      return undefined;
    }
  }

  const rootDomain = getRootDomain().toLowerCase().split(":")[0];
  if (isPublicSuffixDomain(rootDomain)) {
    return undefined;
  }

  // Prepend a leading dot to allow all subdomains to access the auth cookie
  return `.${rootDomain}`;
}

export function getSharedCookieOptions() {
  const domain = getAuthCookieDomain();
  const isProduction = process.env.NODE_ENV === "production";

  return {
    domain,
    path: "/",
    sameSite: "lax" as const,
    secure: isProduction,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}
