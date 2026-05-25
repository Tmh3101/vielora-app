export const MAX_MANUAL_CONTENT_LENGTH = 10000;
export const MAX_MANUAL_TITLE_LENGTH = 100;
export const MAX_KNOWLEDGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_KNOWLEDGE_FILE_EXTENSIONS = [".pdf", ".docx", ".txt", ".csv", ".md"];
export const ALLOWED_KNOWLEDGE_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/octet-stream",
];

export const PDF_FALLBACK_MODEL = process.env.PDF_FALLBACK_MODEL || "gemini-2.5-flash-lite";
export const PDF_FALLBACK_TIMEOUT_MS = 60000;
export const PDF_FALLBACK_MIN_TEXT_LENGTH = 50;

export const SINGLE_URL_CRAWL_TIMEOUT_MS = 30_000;
