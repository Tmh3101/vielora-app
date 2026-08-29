/**
 * Configuration constants for PDF report generation and AI prompt directives.
 */

export const MAX_REPORT_TITLE_LENGTH = 200;
export const MAX_REPORT_CUSTOM_INSTRUCTIONS_LENGTH = 1000;
export const REPORT_POLLING_INTERVAL_MS = 5000;
export const REPORT_INITIAL_POLL_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// API Error codes
// ---------------------------------------------------------------------------

/** Trả về khi workspace chưa đủ plan để xuất báo cáo */
export const PLAN_UPGRADE_REQUIRED = "PLAN_UPGRADE_REQUIRED" as const;

/** Trả về khi workspace không đủ credits để xuất báo cáo */
export const INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS" as const;

/** Lỗi không có quyền hạn truy cập hoặc thực hiện thao tác */
export const FORBIDDEN = "FORBIDDEN" as const;

/** Lỗi giới hạn tần suất yêu cầu */
export const RATE_LIMIT = "RATE_LIMIT" as const;

export enum EExportErrorCode {
  PlanUpgradeRequired = "PLAN_UPGRADE_REQUIRED",
  InsufficientCredits = "INSUFFICIENT_CREDITS",
  Forbidden = "FORBIDDEN",
  RateLimit = "RATE_LIMIT",
}

// ---------------------------------------------------------------------------
// Template key
// ---------------------------------------------------------------------------

/** Key mặc định cho mẫu báo cáo tổng kết bot */
export const DEFAULT_REPORT_TEMPLATE_KEY = "bot-summary-report" as const;

// ---------------------------------------------------------------------------
// Default template schema (dùng chung khi auto-seed)
// ---------------------------------------------------------------------------

export const DEFAULT_REPORT_TEMPLATE_SCHEMA = {
  title: "Bot Summary Report",
  description: "Báo cáo tổng kết tri thức, hoạt động hỏi đáp và xu hướng tài liệu của trợ lý AI",
  sections: [
    { id: "sec-hero", type: "hero", bind: "botIdentity", showBranding: true },
    { id: "sec-summary", type: "text-block", bind: "summary", titleI18n: "report.summary" },
    {
      id: "sec-topics",
      type: "summary-list",
      bind: "keyTopics",
      titleI18n: "report.keyTopics",
    },
    {
      id: "sec-trends",
      type: "chart",
      bind: "topicTrends",
      titleI18n: "report.topicTrends",
      chart: "line",
      options: { colorFromBranding: true },
    },
    { id: "sec-disclaimer", type: "disclaimer", titleI18n: "report.disclaimer" },
    { id: "sec-footer", type: "footer", showBranding: true },
  ],
} as const;

// ---------------------------------------------------------------------------
// Report export review actions
// ---------------------------------------------------------------------------

export enum EReviewAction {
  Approve = "approve",
  Reject = "reject",
}

// ---------------------------------------------------------------------------
// Report export status values
// ---------------------------------------------------------------------------

export enum EReportExportStatus {
  Pending = "pending",
  Rendering = "rendering",
  AwaitingReview = "awaiting_review",
  Approved = "approved",
  Issued = "issued",
  Failed = "failed",
}
