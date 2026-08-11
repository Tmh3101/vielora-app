export const BULK_IMPORT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const BULK_IMPORT_ALLOWED_EXTENSIONS = [".csv"];
export const BULK_IMPORT_SUB_BATCH_SIZE = 15; // 15 bots per sub-batch request for real-time progress
export const BULK_IMPORT_REQUIRED_COLUMNS = [
  "name",
  "slug",
  "knowledge_title",
  "knowledge_content",
] as const;

export const BULK_IMPORT_DEFAULT_SOURCE_MODE = "files";
export const BULK_IMPORT_DEFAULT_DOMAIN = "manual-upload.local";
