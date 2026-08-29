export const BOT_AVATAR_BUCKET_NAME = "bot-avatars";
export const WIDGET_BACKGROUND_BUCKET_NAME = "widget-backgrounds";
export const WIDGET_ICON_BUCKET_NAME = "widget-icons";
export const KNOWLEDGE_FILES_BUCKET_NAME = "knowledge_files";
export const KNOWLEDGE_FILES_PAGE_SIZE = 100;
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export const WIDGET_BACKGROUND_FILE_PREFIX = "background";
export const BOT_AVATAR_FILE_PREFIX = "avatar";
export const WIDGET_ICON_FILE_PREFIX = "icon";

export const DEFAULT_CACHE_CONTROL = "3600";

// ---------------------------------------------------------------------------
// Workspace Branding bucket
// ---------------------------------------------------------------------------

/** Tên bucket Supabase Storage chứa logo / branding assets của workspace */
export const WORKSPACE_BRANDING_BUCKET = "workspace-branding" as const;

/** MIME types được phép upload làm logo workspace */
export const ALLOWED_LOGO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const;

/** Giới hạn kích thước file logo workspace: 2 MB */
export const MAX_LOGO_SIZE = 2 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Report Exports bucket
// ---------------------------------------------------------------------------

/** Tên bucket Supabase Storage chứa các file PDF báo cáo đã xuất */
export const REPORT_EXPORTS_BUCKET = "report-exports" as const;
