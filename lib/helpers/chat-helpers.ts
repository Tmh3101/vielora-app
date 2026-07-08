import { BOT_RATE_LIMIT_ERROR_CODES, type BotRateLimitErrorCode } from "@/lib/bot-rate-limit";
import { INSUFFICIENT_CREDITS_MESSAGE } from "@/lib/constants/chat";
import { EWidgetBackgroundType, WidgetSettings, BotInfo } from "@/types";
import { WIDGET_CONFIG, WIDGET_FALLBACK } from "@/config/widget";

/**
 * Calculate the luminance of a hex color (0-255 scale)
 * Uses standard luminance formula: 0.299*R + 0.587*G + 0.114*B
 */
export function calculateLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 255;
  const g = (rgb >> 8) & 255;
  const b = rgb & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Get icon color (black or white) based on background color luminance
 * Returns white (#ffffff) for dark backgrounds, black (#000000) for light backgrounds
 */
export function getIconColorBasedOnBg(bgColor: string): string {
  const luminance = calculateLuminance(bgColor);
  return luminance > 186 ? "#000000" : "#ffffff";
}

/**
 * Get user message text color based on primary color luminance
 * Returns black (#000000) for light primary colors, white (#ffffff) for dark primary colors
 */
export function getUserMessageTextColor(primaryColor: string): string {
  const luminance = calculateLuminance(primaryColor);
  return luminance > 186 ? "#000000" : "#ffffff";
}

export function parseMarkdown(text: string, primaryColor: string = "#3B82F6"): string {
  if (!text) return "";

  let result = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(
    /`([^`]+)`/g,
    '<code style="background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 0.9em; font-family: monospace;">$1</code>'
  );

  result = result.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<a href="$2" target="_blank" rel="noopener noreferrer" style="color: ${primaryColor}; text-decoration: underline; text-underline-offset: 2px; font-weight: 600;">$1</a>`
  );

  const lines = result.split("\n");
  const blocks: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      `<ul style="list-style-type: disc; list-style-position: outside; margin: 6px 0; padding-left: 20px;">${listItems.join("")}</ul>`
    );
    listItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(`<li style="margin-bottom: 3px;">${line.substring(2)}</li>`);
      continue;
    }

    flushList();
    blocks.push(lines[i]);
  }

  flushList();
  return blocks.join("<br>");
}

export function isMissingBotError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes("Cannot coerce the result to a single JSON object") ||
    error.message.includes("JSON object requested") ||
    error.message.includes("PGRST116")
  );
}

export const getBackgroundStyle = (
  bgType: EWidgetBackgroundType,
  bgValue: string,
  bgOpacity: number
) => {
  if (bgType === EWidgetBackgroundType.Solid) {
    let hex = bgValue && bgValue.startsWith("#") ? bgValue : "#ffffff";
    if (hex.length === 4) {
      hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    const rgb = parseInt(hex.slice(1), 16);
    if (isNaN(rgb)) {
      return { backgroundColor: `rgba(255, 255, 255, ${bgOpacity})` };
    }
    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = rgb & 255;
    return { backgroundColor: "rgba(" + r + ", " + g + ", " + b + ", " + bgOpacity + ")" };
  }

  if (bgType === EWidgetBackgroundType.Gradient) {
    return {
      background: bgValue,
      backgroundColor: `rgba(255, 255, 255, ${1 - bgOpacity})`,
      backgroundBlendMode: "lighten" as const,
    };
  }

  if (bgType === EWidgetBackgroundType.Image) {
    return {
      backgroundImage: `url("${bgValue}")`,
      backgroundColor: `rgba(255, 255, 255, ${1 - bgOpacity})`,
      backgroundBlendMode: "lighten" as const,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }

  return {};
};

export const getRateLimitMessage = (
  botName: string,
  rateLimitErrorCode: BotRateLimitErrorCode,
  fallback?: string
) => {
  switch (rateLimitErrorCode) {
    case BOT_RATE_LIMIT_ERROR_CODES.DailyExceeded:
      return `${botName} đã đạt giới hạn tin nhắn trong ngày.`;
    case BOT_RATE_LIMIT_ERROR_CODES.IpExceeded:
      return `Bạn đã đạt giới hạn tin nhắn trong ngày.`;
    default:
      return fallback || `Đã đạt giới hạn tin nhắn trong ngày.`;
  }
};

export const getChatBlockedData = (
  insufficientCredits: boolean,
  rateLimitExceeded: boolean,
  insufficientCreditsMessage: string | null,
  rateLimitMessage: string | null,
  botName: string
) => {
  const blockedChatMessage = insufficientCredits
    ? insufficientCreditsMessage || INSUFFICIENT_CREDITS_MESSAGE
    : rateLimitExceeded
      ? rateLimitMessage || `${botName} đã đạt giới hạn tin nhắn trong ngày.`
      : null;
  const isChatBlocked = insufficientCredits || rateLimitExceeded;
  return { blockedChatMessage, isChatBlocked };
};

export const generateVisitorId = (): string => {
  const stored = localStorage.getItem(WIDGET_CONFIG.VISITOR_ID_KEY);
  if (stored) return stored;

  const id =
    WIDGET_CONFIG.VISITOR_ID_PREFIX + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  localStorage.setItem(WIDGET_CONFIG.VISITOR_ID_KEY, id);
  return id;
};

export const getFallbackSetting = (): WidgetSettings => ({
  primaryColor: WIDGET_FALLBACK.PRIMARY_COLOR,
  textColor: WIDGET_FALLBACK.TEXT_COLOR,
  position: WIDGET_FALLBACK.POSITION,
  welcomeMessage: WIDGET_FALLBACK.WELCOME_MESSAGE,
});

export const getFallbackBotInfo = (): BotInfo => ({
  botName: WIDGET_FALLBACK.BOT_NAME,
  avatarUrl: null,
  settings: getFallbackSetting(),
  isReady: true,
  previousMessages: [],
  conversationId: undefined,
  rateLimitExceeded: false,
  rateLimitMessage: null,
  insufficientCredits: false,
  insufficientCreditsMessage: null,
});
