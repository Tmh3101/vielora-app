import type { MetadataRoute } from "next";
import type { createServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { getPublicBotAppleTouchIconPath } from "@/lib/public-bot/apple-touch-icon";

export const PUBLIC_BOT_THEME_FALLBACK = "#0f172a";

type PublicSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

export interface PublicBotBranding {
  slug: string;
  name: string;
  widget_settings: Json | null;
  avatar_url: string | null;
}

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

export async function getPublicBotBranding(
  client: PublicSupabaseClient,
  botSlug: string
): Promise<PublicBotBranding | null> {
  const normalizedSlug = botSlug.toLowerCase();
  const { data, error } = await client
    .from("bots")
    .select("slug, name, widget_settings, avatar_url")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as PublicBotBranding | null;
}

export function createPublicBotManifest(
  bot: PublicBotBranding | null,
  botSlug: string
): MetadataRoute.Manifest {
  const name = bot?.name?.trim() || botSlug;
  const themeColor = getPublicBotThemeColor(bot?.widget_settings ?? null);
  const iconPath = getPublicBotAppleTouchIconPath(botSlug);
  const icons: MetadataRoute.Manifest["icons"] = [
    {
      src: iconPath,
      sizes: "180x180",
      type: "image/png",
      purpose: "any",
    },
    {
      src: iconPath,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
  ];

  return {
    name,
    short_name: getPublicBotShortName(name),
    display: "standalone",
    start_url: "/",
    scope: "/",
    theme_color: themeColor,
    background_color: themeColor,
    icons,
  };
}
