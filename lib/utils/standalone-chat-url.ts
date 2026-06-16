import { LOCAL_ROOT, PRODUCTION_ROOT } from "@/config";

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
  return hostname === PRODUCTION_ROOT || hostname === LOCAL_ROOT;
}

export function getStandaloneChatAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `http://${LOCAL_ROOT}:3000`;
    }

    return window.location.origin;
  }

  return `http://${LOCAL_ROOT}:3000`;
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
