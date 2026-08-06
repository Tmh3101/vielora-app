import type { MetadataRoute } from "next";
import type { PublicBotBranding } from "@/lib/services/bot.service";
import type { Json } from "@/lib/supabase/types";
import {
  getPublicBotAppleTouchIconPath,
  getPublicBotIcon512Path,
} from "@/lib/public-bot/apple-touch-icon";
import { EAndroidBrowser, EIOSBrowser } from "@/types/enums";

interface UADataBrand {
  brand: string;
  version: string;
}

declare global {
  interface Navigator {
    userAgentData?: {
      brands: UADataBrand[];
      mobile: boolean;
      platform: string;
    };
  }
}

export function isStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true
  );
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function detectBrowserFromUAData(
  brands: UADataBrand[],
  browserMap: Record<string, string>
): string | null {
  for (const { brand } of brands) {
    for (const [keyword, value] of Object.entries(browserMap)) {
      if (brand.includes(keyword)) return value;
    }
  }
  return null;
}

export function getIOSBrowser(): EIOSBrowser | null {
  if (!isIOS()) return null;

  const ua = navigator.userAgent;

  if (navigator.userAgentData?.brands) {
    const brandValue = detectBrowserFromUAData(navigator.userAgentData.brands, {
      Brave: EIOSBrowser.Brave,
      Chrome: EIOSBrowser.Chrome,
      Firefox: EIOSBrowser.Firefox,
      Edge: EIOSBrowser.Edge,
      Opera: EIOSBrowser.Opera,
      Safari: EIOSBrowser.Safari,
    });
    if (brandValue) return brandValue as EIOSBrowser;
  }

  if (/Brave/i.test(ua)) return EIOSBrowser.Brave;
  if (/CriOS/i.test(ua)) return EIOSBrowser.Chrome;
  if (/FxiOS/i.test(ua)) return EIOSBrowser.Firefox;
  if (/EdgiOS/i.test(ua)) return EIOSBrowser.Edge;
  if (/OPiOS|OPT\//i.test(ua)) return EIOSBrowser.Opera;
  if (/Safari/i.test(ua)) return EIOSBrowser.Safari;

  return EIOSBrowser.Other;
}

export function getAndroidBrowser(): EAndroidBrowser | null {
  const ua = navigator.userAgent;
  if (!/Android/i.test(ua)) return null;

  if (navigator.userAgentData?.brands) {
    const brandValue = detectBrowserFromUAData(navigator.userAgentData.brands, {
      Edge: EAndroidBrowser.Edge,
      Chrome: EAndroidBrowser.Chrome,
    });
    if (brandValue) return brandValue as EAndroidBrowser;
  }

  if (/EdgA\//i.test(ua)) return EAndroidBrowser.Edge;
  if (/Chrome\//i.test(ua)) return EAndroidBrowser.Chrome;

  return EAndroidBrowser.Other;
}

export const PUBLIC_BOT_THEME_FALLBACK = "#0f172a";

interface WidgetSettings {
  primaryColor?: string;
}

function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value);
}

function asWidgetSettings(value: Json | null): WidgetSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const primaryColor = value.primaryColor;
  return typeof primaryColor === "string" ? { primaryColor } : {};
}

export function getPublicBotThemeColor(widgetSettings: Json | null): string {
  const primaryColor = asWidgetSettings(widgetSettings).primaryColor?.trim();
  return primaryColor && isHexColor(primaryColor) ? primaryColor : PUBLIC_BOT_THEME_FALLBACK;
}

export function getPublicBotShortName(name: string): string {
  const trimmedName = name.trim();
  return trimmedName.length > 24 ? trimmedName.slice(0, 24).trim() : trimmedName;
}

export function getPublicBotPwaVersion(pwaUpdatedAt: string | undefined | null): string {
  if (!pwaUpdatedAt) return "1";
  return new Date(pwaUpdatedAt).getTime().toString();
}

export function createPublicBotManifest(
  bot: PublicBotBranding | null,
  botSlug: string,
  pwaVersion?: string
): MetadataRoute.Manifest {
  const name = bot?.name?.trim() || botSlug;
  const themeColor = getPublicBotThemeColor(bot?.widget_settings ?? null);
  const v = pwaVersion || "1";
  const appleTouchIconPath = getPublicBotAppleTouchIconPath(botSlug, v);
  const icon512Path = getPublicBotIcon512Path(botSlug, v);
  const icons: MetadataRoute.Manifest["icons"] = [
    {
      src: appleTouchIconPath,
      sizes: "180x180",
      type: "image/png",
      purpose: "any",
    },
    {
      src: icon512Path,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: icon512Path,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];

  return {
    id: `/public-bot/${botSlug}`,
    name,
    short_name: getPublicBotShortName(name),
    display: "standalone",
    start_url: `/public-bot/${botSlug}/?source=pwa`,
    scope: `/public-bot/${botSlug}/`,
    theme_color: themeColor,
    background_color: themeColor,
    icons,
  };
}
