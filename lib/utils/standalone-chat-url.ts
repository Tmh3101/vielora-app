import {
  LOCAL_ROOT,
  PRODUCTION_ROOT,
  getRootDomain,
  RESERVED_SUBDOMAINS as RESERVED_SUBDOMAINS_LIST,
} from "@/config";

const RESERVED_SUBDOMAINS = new Set<string>(RESERVED_SUBDOMAINS_LIST);
const KNOWN_ROOT_DOMAINS = ["staging-vielora.click", "vielora.vn", LOCAL_ROOT];

export interface StandaloneChatUrlParts {
  prefix: string;
  suffix: string;
  href: string;
}

function getDisplayHostname(appUrl: string): string {
  try {
    return new URL(appUrl).hostname;
  } catch {
    return appUrl.replace(/^https?:\/\//, "").split("/")[0];
  }
}

function isVieloraRootHostname(hostname: string): boolean {
  const rootDomain = getRootDomain();
  return (
    hostname === rootDomain ||
    hostname === PRODUCTION_ROOT ||
    hostname === LOCAL_ROOT ||
    KNOWN_ROOT_DOMAINS.includes(hostname) ||
    hostname.endsWith(`.${rootDomain}`) ||
    KNOWN_ROOT_DOMAINS.some((domain) => hostname.endsWith(`.${domain}`))
  );
}

export function getMainAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";

    if (hostname.endsWith(`.${LOCAL_ROOT}`) || hostname === LOCAL_ROOT) {
      return `${protocol}//${LOCAL_ROOT}${port}`;
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}${port}`;
    }

    const rootDomain = getRootDomain();
    if (hostname.endsWith(`.${rootDomain}`) || hostname === rootDomain) {
      return `${protocol}//${rootDomain}${port}`;
    }

    for (const knownRoot of KNOWN_ROOT_DOMAINS) {
      if (hostname.endsWith(`.${knownRoot}`) || hostname === knownRoot) {
        return `${protocol}//${knownRoot}${port}`;
      }
    }

    return window.location.origin;
  }

  return "https://vielora.vn";
}

export function getStandaloneChatAppUrl(): string {
  return getMainAppUrl();
}

export function isBotSubdomainHost(hostname?: string): boolean {
  let host = hostname;
  if (!host) {
    if (typeof window === "undefined") return false;
    host = window.location.hostname;
  }
  host = host.toLowerCase().split(":")[0];

  if (host === "localhost" || host === "127.0.0.1") {
    return false;
  }

  const rootDomain = getRootDomain().toLowerCase().split(":")[0];
  const allRoots = [rootDomain, PRODUCTION_ROOT, ...KNOWN_ROOT_DOMAINS];

  for (let i = 0; i < allRoots.length; i++) {
    const root = allRoots[i];
    if (root && host.endsWith(`.${root}`)) {
      const sub = host.slice(0, -root.length - 1);
      if (sub && !sub.includes(".") && !RESERVED_SUBDOMAINS.has(sub)) {
        return true;
      }
    }
  }

  return false;
}

export function getBotStandaloneChatPath(botSlug?: string, hostname?: string): string {
  if (isBotSubdomainHost(hostname)) {
    return "/";
  }
  return botSlug ? `/public-bot/${botSlug}` : "/";
}

export function getBotGroupChatPath(botSlug?: string, hostname?: string): string {
  if (isBotSubdomainHost(hostname)) {
    return "/group";
  }
  return botSlug ? `/public-bot/${botSlug}/group` : "/group";
}

export function getPwaScopedBotChatPath(botSlug: string): string {
  return `/public-bot/${botSlug}`;
}

export function getPwaScopedBotGroupPath(botSlug: string): string {
  return `/public-bot/${botSlug}/group`;
}

/**
 * Login URL that stays inside the public-bot PWA scope (`/public-bot/:slug/`).
 * Navigating to `/auth` on the main app origin is outside that scope, so iOS/Android
 * open Safari/Chrome and never return to the installed PWA.
 */
export function getBotAuthUrl(botSlug?: string, hostname?: string): string {
  const mainAppUrl = getMainAppUrl();

  if (isBotSubdomainHost(hostname)) {
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const nextUrl = currentOrigin ? `${currentOrigin}/group` : "/group";
    return `${mainAppUrl}/auth?next=${encodeURIComponent(nextUrl)}`;
  }

  if (!botSlug) {
    return `${mainAppUrl}/auth`;
  }

  const nextPath = getPwaScopedBotGroupPath(botSlug);
  return `${mainAppUrl}/auth?next=${encodeURIComponent(nextPath)}`;
}

export function getStandaloneChatUrlParts(appUrl: string, slug: string): StandaloneChatUrlParts {
  try {
    const url = new URL(appUrl);
    const hostname = url.hostname.replace(/^www\./, "");
    const port = url.port ? `:${url.port}` : "";
    const origin = `${url.protocol}//${url.host}`;

    if (isVieloraRootHostname(hostname)) {
      return {
        prefix: `${url.protocol}//`,
        suffix: `.${hostname}${port}`,
        href: slug ? `${url.protocol}//${slug}.${hostname}${port}` : "",
      };
    }

    return {
      prefix: `${getDisplayHostname(appUrl)}/chat/`,
      suffix: "",
      href: slug ? `${origin}/chat/${slug}` : "",
    };
  } catch {
    return {
      prefix: `${getDisplayHostname(appUrl)}/chat/`,
      suffix: "",
      href: slug ? `${appUrl.replace(/\/$/, "")}/chat/${slug}` : "",
    };
  }
}

export function getGroupChatUrl(slug: string): string {
  const appUrl = getStandaloneChatAppUrl();

  try {
    const url = new URL(appUrl);
    const hostname = url.hostname.replace(/^www\./, "");
    if (isVieloraRootHostname(hostname) || process.env.NODE_ENV === "production") {
      const port = url.port ? `:${url.port}` : "";
      return `${url.protocol}//${slug}.${hostname}${port}/group`;
    }
    return `${appUrl}/public-bot/${slug}/group`;
  } catch {
    const rootDomain = getRootDomain();
    return `https://${slug}.${rootDomain}/group`;
  }
}
