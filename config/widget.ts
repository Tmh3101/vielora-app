import { EWidgetBackgroundType, EWidgetIconType } from "@/types";

/**
 * Widget Position & Sizing Configuration
 */
export const WIDGET_POSITION = {
  FRAME_WIDTH: 340,
  FRAME_HEIGHT: 400,
  ICON_SIZE: 56,
  PADDING: 16,
};

export const DEFAULT_WIDGET_POSITION = '{"x":300.3883495145631,"y":328}';

/**
 * Widget Settings Limits
 */
export const WIDGET_LIMITS = {
  SUGGESTED_QUESTIONS_MAX_COUNT: 3,
  SUGGESTED_QUESTIONS_MAX_LENGTH: 50,
  CHAT_BACKGROUND_MAX_FILE_SIZE: 2 * 1024 * 1024,
  CHAT_BACKGROUND_OPACITY_MIN: 0,
  CHAT_BACKGROUND_OPACITY_MAX: 100,
  CHAT_ICON_MAX_FILE_SIZE: 2 * 1024 * 1024,
  CHAT_ICON_PRESETS: [
    { id: "messagecircle", name: "Message" },
    { id: "headphones", name: "Headphones" },
    { id: "help", name: "Trợ giúp" },
    { id: "comment", name: "Bình luận" },
    { id: "bot", name: "Robot" },
    { id: "sparkles", name: "Sáng tạo" },
    { id: "zap", name: "Năng lượng" },
    { id: "smile", name: "Cười" },
    { id: "briefcase-business", name: "Briefcase" },
    { id: "square-arrow-out-up-left", name: "Arrow" },
    { id: "users-round", name: "Users" },
    { id: "badge-info", name: "Info" },
    { id: "inbox", name: "Inbox" },
    { id: "square-user-round", name: "User" },
    { id: "user-round-cog", name: "Settings" },
    { id: "settings", name: "Gear" },
    { id: "sliders-horizontal", name: "Sliders" },
    { id: "handshake", name: "Handshake" },
    { id: "app-window", name: "Window" },
    { id: "hand-grab", name: "Grab" },
    { id: "loader-pinwheel", name: "Pinwheel" },
    { id: "android", name: "Android" },
    { id: "triangle", name: "Triangle" },
    { id: "api", name: "API" },
    { id: "code", name: "Code" },
    { id: "cube", name: "Cube" },
    { id: "ai-agent", name: "AI Agent" },
    { id: "ai", name: "AI" },
  ],
};

/**
 * Widget Demo & API Configuration
 */
export const WIDGET_CONFIG = {
  DEMO_BOT_ID: process.env.NEXT_PUBLIC_DEMO_BOT_ID,
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL,
  VISITOR_ID_KEY: "vielora_visitor_id",
  VISITOR_ID_PREFIX: "demo_visitor_",
  PREVIEW_EDGE_OFFSET: 40,
};

/**
 * Widget Fallback Values
 */
export const WIDGET_FALLBACK = {
  BOT_NAME: "Vielora AI",
  WELCOME_MESSAGE: "Xin chào! Tôi là AI Assistant với dữ liệu thật. Hãy hỏi tôi bất cứ điều gì!",
  PRIMARY_COLOR: "#3B82F6",
  TEXT_COLOR: "#1f2937",
  POSITION: DEFAULT_WIDGET_POSITION,
  CHAT_BACKGROUND_TYPE: EWidgetBackgroundType.Solid,
  CHAT_BACKGROUND_VALUE: "#ffffff",
  CHAT_BACKGROUND_OPACITY: 100,
  CHAT_ICON_TYPE: EWidgetIconType.Preset,
  CHAT_ICON_PRESET: "messagecircle",
  CHAT_ICON_COLOR: "#ffffff",
  CHAT_ICON_BG_COLOR: "#3B82F6",
};

/**
 * Widget UI Messages
 */
export const WIDGET_MESSAGES = {
  HISTORY_SEPARATOR: "--- Lịch sử trò chuyện ---",
  OFFLINE_PREFIX: "offline_",
  INPUT_PLACEHOLDER: "Nhập tin nhắn...",
  TECHNICAL_ERROR:
    "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc sử dụng widget thật.",
  API_ERROR: "Xin lỗi, tôi không nhận được phản hồi.",
  MAX_LENGTH_WARNING: (max: number) =>
    `Tin nhắn quá dài (tối đa ${max} ký tự). Vui lòng rút gọn nội dung.`,
};

export const CONVERSATION_MAX_AGE = 24 * 60 * 60 * 1000;

export const QR_CODE_SIZE = 220;
export const AVATAR_SIZE = 32;
export const TRANSPARENT_AVATAR_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
