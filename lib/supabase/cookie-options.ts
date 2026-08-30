import { getRootDomain } from "@/config";

/**
 * Returns the cookie domain for authentication cookies so sessions can be shared
 * seamlessly between the main application (e.g., vielora.vn) and all bot subdomains (*.vielora.vn).
 * Returns undefined for local development to keep cookies host-only.
 */
export function getAuthCookieDomain(): string | undefined {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local")
    ) {
      return undefined;
    }
  }

  const rootDomain = getRootDomain().toLowerCase().split(":")[0];
  if (
    rootDomain === "localhost" ||
    rootDomain === "127.0.0.1" ||
    rootDomain.endsWith(".localhost") ||
    rootDomain.endsWith(".local")
  ) {
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
