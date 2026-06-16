export const CHATBOT_UNAVAILABLE_MESSAGE = "Chatbot không còn tồn tại hoặc đã bị xóa.";
export const FALLBACK_CHAT_TITLE = "Chat with Vielora";
export const INSUFFICIENT_CREDITS_ERROR_CODE = "INSUFFICIENT_CREDITS";
export const INSUFFICIENT_CREDITS_MESSAGE = "Bot hiện đã hết credits. Vui lòng quay lại sau.";

export const BANNER_DISMISSED_KEY = "vielora_pwa_banner_dismissed";

export const BannerActionType = {
  GO_OFFLINE: "GO_OFFLINE",
  RECOVER: "RECOVER",
  HIDE: "HIDE",
} as const;

export type BannerAction = { type: "GO_OFFLINE" } | { type: "RECOVER" } | { type: "HIDE" };
