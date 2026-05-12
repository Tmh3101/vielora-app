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

export const GENERATION_CONFIG = {
  temperature: 0.3, // Keep RAG temperature low (0.1 - 0.3) to reduce hallucinations
  topP: 0.95, // Higher topP allows more diverse responses while maintaining quality
  topK: 40, // Higher topK gives the model more candidate tokens for more flexible generation
  maxOutputTokens: 512, // Higher maxOutputTokens allows longer answers, especially when many references are used
};

// Limit the maximum length of user chat input
export const MAX_CHAT_INPUT = 200;

// Batch and retry configuration for embedding generation
export const BATCH_SIZE = 100;
export const MAX_RETRIES = 5;
export const INITIAL_BACKOFF_MS = 2000;
