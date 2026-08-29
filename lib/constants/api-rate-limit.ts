export interface ApiRateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
}

export const API_RATE_LIMITS: Record<string, ApiRateLimitConfig> = {
  widgetInit: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: "Many requests detected. Please wait a moment before trying again.",
  },
  widgetChat: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: "You are sending messages too quickly. Please wait a moment.",
  },
  widgetVoice: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: "Bạn đang gửi tin nhắn thoại quá nhanh. Vui lòng đợi một lát.",
  },
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: "Too many requests. Please try again later.",
  },
  groupMessage: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: "Nhóm đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau.",
  },
  groupMessageRead: {
    windowMs: 60 * 1000,
    maxRequests: 120,
    message: "Bạn đang tải tin nhắn quá nhanh. Vui lòng đợi một lát.",
  },
  REPORT_EXPORT: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: "Bạn đang yêu cầu xuất báo cáo quá nhanh. Vui lòng đợi một lát.",
  },
  reportExport: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: "Bạn đang yêu cầu xuất báo cáo quá nhanh. Vui lòng đợi một lát.",
  },
} as const;

export const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
