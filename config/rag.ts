// Configuration
export const CHUNK_SIZE = 1000; // Target chunk size in characters (roughly ~250 tokens)
export const CHUNK_OVERLAP = 150; // Overlap between chunks for context continuity (in characters ~ 40 tokens)
export const MIN_CHUNK_SIZE = 10; // Minimum chunk size to avoid creating too small chunks

export const RATE_LIMIT_DELAY = 1000; // Delay between embedding requests (1 second for Google Free Tier)
export const EMBEDDING_DIMENSIONS = 768;

export const MAX_DOCS_RETRIEVAL = 5; // Maximum number of relevant documents to retrieve for RAG
export const FULL_TEXT_WEIGHT = 0.3; // Weight for full-text search in hybrid retrieval
export const SEMANTIC_WEIGHT = 0.7; // Weight for semantic search in hybrid retrieval

export const MAX_HISTORY_MESSAGES = 3; // Maximum number of previous messages to include in context for Gemini

export const ERROR_RESPONSE =
  "Xin lỗi, hiện tại tôi không thể truy cập thông tin cần thiết để trả lời câu hỏi của bạn. Vui lòng thử lại sau hoặc liên hệ với chúng tôi qua form liên hệ trên trang để được hỗ trợ nhanh chóng hơn.";

export const NO_ANSWER_PHRASES = ["không có đủ thông tin", "không tìm thấy"];

export const SIMILARITY_THRESHOLD = 0.65; // Cosine similarity threshold. RAG returns raw cosine sim (0-1); truly relevant docs score >0.7, loose matches score ~0.5-0.6
export const LEAD_FORM_ENABLED = true; // Master toggle for lead generation form feature

export const NEGATIVE_KEYWORDS = [
  "gia",
  "bao nhieu",
  "o dau",
  "nhu the nao",
  "tinh nang",
  "loi",
  "mua",
  "khong",
  "sao",
  "the nao",
  "lam sao",
  "co gi",
  "tai sao",
];

export const SOCIAL_KEYWORDS = [
  "xin chào",
  "chào",
  "hi",
  "hello",
  "hey",
  "alo",
  "chào bạn",
  "chào bot",
  "chào ad",
  "chào shop",
  "hi shop",
  "chào buổi sáng",
  "chào buổi chiều",
  "chào buổi tối",

  "cảm ơn",
  "cám ơn",
  "thanks",
  "thank you",
  "thankyou",
  "tks",
  "thank",
  "cám ơn shop",
  "cảm ơn shop",
  "cảm ơn bạn",

  "tạm biệt",
  "bye",
  "goodbye",
  "bái bai",
  "bye bye",
  "hẹn gặp lại",

  "bạn là ai",
  "bot là ai",
  "bạn tên gì",
  "bot tên gì",
  "ai đây",
  "có thể giúp gì",
  "help",
  "hỗ trợ",

  "ok",
  "okay",
  "oke",
  "okee",
  "vâng",
  "dạ",
  "ừ",
  "ừm",
  "dạ vâng",
  "ok shop",
  "ok bot",
  "dạ được",
  "ok nha",
];

export const GENERATION_CONFIG = {
  temperature: 0.15,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 768,
};

// Limit the maximum length of user chat input
export const MAX_CHAT_INPUT = 200;

// Batch and retry configuration for embedding generation
export const BATCH_SIZE = 100;
export const MAX_RETRIES = 5;
export const INITIAL_BACKOFF_MS = 2000;
