export enum EBotStatus {
  Pending = "pending",
  Discovering = "discovering",
  Discovered = "discovered",
  Indexing = "indexing",
  Ready = "ready",
  Failed = "failed",
}

export enum EPageStatus {
  Pending = "pending",
  Processing = "processing",
  PendingIndex = "pending_index",
  Ignored = "ignored",
  Completed = "completed",
  Failed = "failed",
}

export enum ESubscriptionPlan {
  Free = "free",
  Pro = "pro",
  Standard = "standard",
  Enterprise = "enterprise",
}

export enum ESubscriptionStatus {
  Active = "active",
  PastDue = "past_due",
  Canceled = "canceled",
  Unpaid = "unpaid",
}

export enum EJobStatus {
  Pending = "pending",
  Active = "active",
  Completed = "completed",
  Failed = "failed",
}

export enum EJobType {
  Discover = "discover",
  Indexer = "indexer",
}

export enum ESubscriptionCycle {
  Monthly = "monthly",
  Yearly = "yearly",
}

export enum EPaymentStatus {
  Pending = "pending",
  Completed = "completed",
  Failed = "failed",
  Refunded = "refunded",
}

export enum EPaymentType {
  Subscription = "subscription",
  SubscriptionUpgrade = "subscription_upgrade",
  SubscriptionRenew = "subscription_renew",
  PayAsYouGo = "payg",
}

export enum EPaymentProvider {
  PayOS = "payos",
  VNPAY = "vnpay",
}

export enum EPaymentCurrency {
  VND = "VND",
  USD = "USD",
}

export enum ETransactionType {
  SubscriptionRenewal = "subscription_renewal",
  IndexPages = "index_pages",
  IndexPagesRefund = "index_pages_refund",
  ChatMessage = "chat_message",
  ChatMessageRefund = "chat_message_refund",
  AddKnowledge = "add_knowledge",
  AddKnowledgeRefund = "add_knowledge_refund",
  UpdateKnowledge = "update_knowledge",
  UpdateKnowledgeRefund = "update_knowledge_refund",
  PlanDowngrade = "plan_downgrade",
  MonthlyReset = "monthly_reset",
  PaygPurchase = "payg_purchase",
}

export enum EPageSourceType {
  Website = "website",
  ManualText = "manual_text",
  File = "file",
  SingleUrl = "single_url",
}

export enum EPageErrorType {
  NetworkError = "network_error", // DNS failure, connection refused
  TimeoutError = "timeout_error", // Request / navigation timed out
  HttpError = "http_error", // Non-2xx HTTP status (404, 500, etc.)
  NotFound = "not_found", // HTTP 404 Not Found
  RateLimited = "rate_limited", // HTTP 429 Too Many Requests
  Blocked = "blocked", // HTTP 403 / bot-detection block
  ParseError = "parse_error", // HTML / DOM parsing failed
  RenderError = "render_error", // Puppeteer / dynamic rendering failed
  EmptyContent = "empty_content", // Fetched OK but no extractable content
  UrlError = "url_error", // Invalid or malformed URL
  UnknownError = "unknown_error", // Catch-all
}

export enum EMessageRole {
  User = "user",
  Assistant = "assistant",
  System = "system",
  Bot = "bot",
}

export enum EUsageAction {
  ChatMessage = "chat_message",
}

export enum EWidgetBackgroundType {
  Solid = "solid",
  Gradient = "gradient",
  Image = "image",
}

export enum EWidgetIconType {
  Preset = "preset",
  Custom = "custom",
}

export enum EIOSBrowser {
  Safari = "safari",
  Chrome = "chrome",
  Firefox = "firefox",
  Edge = "edge",
  Brave = "brave",
  Other = "other",
}

export enum BannerState {
  Hidden = "hidden",
  Offline = "offline",
  Recovering = "recovering",
}
