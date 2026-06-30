import type { InitResponse } from "@/types";
import { WIDGET_CONFIG, WIDGET_MESSAGES, WIDGET_FALLBACK } from "@/config/widget";
import { BOT_RATE_LIMIT_ERROR_CODES } from "@/lib/bot-rate-limit";
import {
  INSUFFICIENT_CREDITS_ERROR_CODE,
  INSUFFICIENT_CREDITS_MESSAGE,
} from "@/lib/constants/chat";
import { INIT_CACHE_TTL } from "@/config";
import { BotInfo } from "@/types/widget-api";
import {
  generateVisitorId,
  getFallbackSetting,
  getFallbackBotInfo,
} from "@/lib/helpers/chat-helpers";

export const callChatAPI = async (
  botId: string,
  message: string,
  conversationId?: string
): Promise<{
  message: string;
  conversationId: string;
  rateLimitExceeded?: boolean;
  rateLimitMessage?: string | null;
  insufficientCredits?: boolean;
  insufficientCreditsMessage?: string | null;
}> => {
  const visitorId = generateVisitorId();

  try {
    const response = await fetch(`${WIDGET_CONFIG.BASE_URL}/api/widget/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-id": botId,
        "x-visitor-id": visitorId,
      },
      body: JSON.stringify({
        botId: botId,
        message: message,
        conversationId: conversationId,
        visitorId: visitorId,
      }),
    });

    if (response.status === 429) {
      const data: InitResponse = await response.json();
      return {
        message: data.message || WIDGET_MESSAGES.API_ERROR,
        conversationId: conversationId || "",
        rateLimitExceeded: data.code !== BOT_RATE_LIMIT_ERROR_CODES.ApiExceeded,
        rateLimitMessage: data.message || null,
      };
    }

    if (response.status === 403) {
      throw new Error("Domain not allowed");
    }

    if (response.status === 402) {
      const data = await response.json();
      return {
        message: data.message || INSUFFICIENT_CREDITS_MESSAGE,
        conversationId: conversationId || "",
        insufficientCredits: data.code === INSUFFICIENT_CREDITS_ERROR_CODE,
        insufficientCreditsMessage: data.message || INSUFFICIENT_CREDITS_MESSAGE,
      };
    }

    if (!response.ok) {
      throw new Error("API call failed");
    }

    const data = await response.json();

    if (data.success && data.data) {
      return {
        message: data.data.message || WIDGET_MESSAGES.API_ERROR,
        conversationId: data.data.conversationId || conversationId || "",
      };
    }

    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Error calling Vielora API:", error);
    return {
      message: WIDGET_MESSAGES.API_ERROR,
      conversationId: conversationId || WIDGET_MESSAGES.OFFLINE_PREFIX + Date.now(),
    };
  }
};

const initBotCache = new Map<string, { data: BotInfo; timestamp: number }>();
const initBotPromiseCache = new Map<string, Promise<BotInfo>>();

// Function to initialize demo bot (matching widget.js init)
export const initDemoBot = async (botId: string): Promise<BotInfo> => {
  const cached = initBotCache.get(botId);
  if (cached && Date.now() - cached.timestamp < INIT_CACHE_TTL) {
    return structuredClone(cached.data);
  }

  const inFlight = initBotPromiseCache.get(botId);
  if (inFlight) return inFlight;

  const promise = _fetchInitBot(botId);
  initBotPromiseCache.set(botId, promise);

  try {
    return await promise;
  } finally {
    initBotPromiseCache.delete(botId);
  }
};

async function _fetchInitBot(botId: string): Promise<BotInfo> {
  const visitorId = generateVisitorId();

  try {
    const response = await fetch(`${WIDGET_CONFIG.BASE_URL}/api/widget/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-id": botId,
        "x-visitor-id": visitorId,
      },
      body: JSON.stringify({
        botId: botId,
        visitorId: visitorId,
      }),
    });

    if (!response.ok) {
      throw new Error("Init API call failed");
    }

    const data: InitResponse = await response.json();

    if (data.success && data.data) {
      const result: BotInfo = {
        botName: data.data.name || WIDGET_FALLBACK.BOT_NAME,
        avatarUrl: data.data.avatarUrl || null,
        settings: data.data.settings || getFallbackSetting(),
        isReady: data.data.status === "ready",
        previousMessages: data.data.messages || [],
        conversationId: data.data.conversationId || undefined,
        rateLimitExceeded: Boolean(data.data.rateLimitExceeded),
        rateLimitMessage: data.data.rateLimitMessage || null,
        insufficientCredits: false,
        insufficientCreditsMessage: null,
      };

      initBotCache.set(botId, { data: result, timestamp: Date.now() });
      return structuredClone(result);
    }

    throw new Error("Invalid init response format");
  } catch (error) {
    console.error("Error initializing demo bot:", error);
    return getFallbackBotInfo();
  }
}
