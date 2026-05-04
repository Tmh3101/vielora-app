// Configuration
export const CHUNK_SIZE = 1000; // Target chunk size in characters (roughly ~250 tokens)
export const CHUNK_OVERLAP = 150; // Overlap between chunks for context continuity (in characters ~ 40 tokens)
export const MIN_CHUNK_SIZE = 50; // Minimum chunk size to avoid creating too small chunks

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
  temperature: 0.3, // RAG NÊN ĐỂ TEMPERATURE THẤP (0.1 - 0.3) ĐỂ TRÁNH BỊA ĐẶT (Hallucination)
  topP: 0.95, // Tăng topP để có câu trả lời đa dạng hơn, nhưng vẫn giữ chất lượng
  topK: 40, // Tăng topK để mô hình có nhiều lựa chọn hơn khi tạo câu trả lời, giúp tăng tính sáng tạo
  maxOutputTokens: 512, // Tăng maxOutputTokens để cho phép câu trả lời dài hơn, đặc biệt khi có nhiều thông tin từ tài liệu tham khảo
};

// Giới hạn độ dài chat của người dùng
export const MAX_CHAT_INPUT = 200;
