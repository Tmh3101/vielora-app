import { ImageResponse } from "next/og";
import { APPLE_TOUCH_ICON_SIZE } from "@/lib/public-bot/apple-touch-icon";
import { getPublicBotThemeColor } from "@/lib/public-bot/branding";
import type { PublicBotBranding } from "@/lib/public-bot/branding";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
  "Content-Type": "image/png",
};

function getBotInitial(name: string, botSlug: string): string {
  const label = name.trim() || botSlug;
  return label.charAt(0).toUpperCase();
}

function createPublicBotIcon(
  bot: PublicBotBranding | null,
  botSlug: string,
  size: number
): ImageResponse {
  const themeColor = getPublicBotThemeColor(bot?.widget_settings ?? null);
  const name = bot?.name?.trim() || botSlug;
  const initial = getBotInitial(name, botSlug);
  const fontSize = size <= 180 ? 72 : 196;

  if (bot?.avatar_url) {
    return new ImageResponse(
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: themeColor,
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bot.avatar_url}
          alt=""
          width={size}
          height={size}
          style={{
            objectFit: "cover",
            width: "100%",
            height: "100%",
          }}
        />
      </div>,
      {
        width: size,
        height: size,
        headers: CACHE_HEADERS,
      }
    );
  }

  return new ImageResponse(
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: themeColor,
        color: "#ffffff",
        fontSize,
        fontWeight: 700,
      }}
    >
      {initial}
    </div>,
    {
      width: size,
      height: size,
      headers: CACHE_HEADERS,
    }
  );
}

export function createPublicBotAppleTouchIcon(
  bot: PublicBotBranding | null,
  botSlug: string
): ImageResponse {
  return createPublicBotIcon(bot, botSlug, APPLE_TOUCH_ICON_SIZE);
}

export function createPublicBotIcon512(
  bot: PublicBotBranding | null,
  botSlug: string
): ImageResponse {
  return createPublicBotIcon(bot, botSlug, 512);
}
