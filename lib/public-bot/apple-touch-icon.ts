import { LOCAL_ROOT, PRODUCTION_ROOT } from "@/config";

export const APPLE_TOUCH_ICON_SIZE = 180;
export const PUBLIC_BOT_ICON_SIZE_512 = 512;

export function getPublicBotOrigin(botSlug: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const protocol = isProduction ? "https://" : "http://";
  const root = isProduction ? PRODUCTION_ROOT : LOCAL_ROOT;
  const port = isProduction ? "" : ":3000";

  return `${protocol}${botSlug}.${root}${port}`;
}

export function getPublicBotAppleTouchIconPath(botSlug: string, version?: string): string {
  const base = `/public-bot/${botSlug}/apple-touch-icon.png`;
  return version ? `${base}?v=${version}` : base;
}

export function getPublicBotAppleTouchIconUrl(botSlug: string, version?: string): string {
  return `${getPublicBotOrigin(botSlug)}${getPublicBotAppleTouchIconPath(botSlug, version)}`;
}

export function getPublicBotIcon512Path(botSlug: string, version?: string): string {
  const base = `/public-bot/${botSlug}/icon-512.png`;
  return version ? `${base}?v=${version}` : base;
}
