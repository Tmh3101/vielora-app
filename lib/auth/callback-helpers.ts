import { getRootDomain } from "@/config";

export function isAllowedCallbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase().split(":")[0];
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost") || h.endsWith(".local"))
    return true;
  try {
    const rootDomain = getRootDomain().toLowerCase().split(":")[0];
    if (h === rootDomain || h.endsWith(`.${rootDomain}`)) return true;
  } catch {
    // ignore
  }
  // fallback allow vielora.vn explicitly
  if (h === "vielora.vn" || h.endsWith(".vielora.vn")) return true;
  return false;
}

export function getRequestOrigin(request: Request): string {
  const rawXfHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const xfProto = request.headers.get("x-forwarded-proto");
  if (rawXfHost) {
    // x-forwarded-host có thể chứa danh sách cách nhau bởi dấu phẩy
    const xfHost = rawXfHost.split(",")[0].trim().split(" ")[0].trim();
    const hostnameOnly = xfHost.split(":")[0];
    if (isAllowedCallbackHost(hostnameOnly)) {
      const proto = xfProto?.split(",")[0].trim() ?? "https";
      // Giữ nguyên port nếu có trong xfHost
      return `${proto}://${xfHost}`;
    }
    console.warn("[AuthCallback] Blocked untrusted host", { xfHost, hostnameOnly });
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
    } catch {
      // fall through
    }
  }
  return new URL(request.url).origin;
}

export function getSafeCallbackRedirect(rawNext: string | null, origin: string): URL {
  const defaultUrl = new URL("/dashboard", origin);
  if (!rawNext) return defaultUrl;

  // Chặn loop về /auth (nếu next=/auth thì về dashboard)
  const lowerNext = rawNext.toLowerCase();
  if (
    lowerNext === "/auth" ||
    lowerNext.startsWith("/auth?") ||
    lowerNext.startsWith("/auth#") ||
    lowerNext.startsWith("/auth/")
  ) {
    return defaultUrl;
  }

  if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")) {
    return new URL(rawNext, origin);
  }

  try {
    const parsed = new URL(rawNext);
    // Chặn loop về /auth ngay cả khi là full URL
    const p = parsed.pathname.toLowerCase();
    if (p === "/auth" || p.startsWith("/auth/")) {
      return defaultUrl;
    }
    const rootDomain = getRootDomain().toLowerCase().split(":")[0];
    const host = parsed.hostname.toLowerCase();
    if (
      host === rootDomain ||
      host.endsWith(`.${rootDomain}`) ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local")
    ) {
      return parsed;
    }
  } catch {
    // Ignore invalid url format
  }

  return defaultUrl;
}
