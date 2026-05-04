import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { EMBEDDING_DIMENSIONS, GENERATION_CONFIG } from "@/config";
import { MessageRole } from "@/lib/constants";

// Validate API key at module load time
if (!process.env.GOOGLE_API_KEY) {
  console.warn("GOOGLE_API_KEY is not configured. Gemini API calls will fail.");
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
export const CHAT_MODEL = process.env.CHAT_MODEL || "gemini-2.5-flash-lite";

export interface EmbeddingRequest {
  text: string;
  isQuery?: boolean;
  documentTitle?: string;
}

/**
 * Generate embedding for a single text using Google's text-embedding-004 model
 * @param text - The text to embed
 * @returns Promise<number[]> - 768-dimensional embedding vector
 */
export async function generateEmbedding({
  text,
  isQuery = false,
  documentTitle,
}: EmbeddingRequest): Promise<number[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  try {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

    const result = await model.embedContent({
      content: { parts: [{ text }], role: MessageRole.USER },
      taskType: isQuery ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT,
      ...(documentTitle && !isQuery && { title: documentTitle }),
      // @ts-expect-error - outputDimensionality is a valid option but not in the type definitions yet
      outputDimensionality: EMBEDDING_DIMENSIONS,
    });

    const embedding = result.embedding.values;

    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Unexpected embedding dimension: ${embedding?.length}`);
    }

    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

type MessageRoleType = (typeof MessageRole)[keyof typeof MessageRole];
type ConversationType = Array<{ role: MessageRoleType; content: string }>;

/**
 * @param systemPrompt - The system instructions/context (Chứa RAG Context ở đây)
 * @param userMessage - The user's message
 * @param conversationHistory - Optional previous messages for context
 * @returns Promise<string> - The generated response text
 */
export async function generateChatResponse(
  systemPrompt: string,
  userMessage: string,
  conversationHistory?: ConversationType
): Promise<string> {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  try {
    const model = genAI.getGenerativeModel({
      model: CHAT_MODEL,
      systemInstruction: systemPrompt,
    });

    const safeHistory = (conversationHistory || [])
      .filter((msg) => msg.content && msg.content.trim() !== "")
      .map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }] as [{ text: string }],
      }));

    const mergedHistory: Array<{ role: MessageRoleType; parts: [{ text: string }] }> = [];
    for (const msg of safeHistory) {
      if (mergedHistory.length > 0 && mergedHistory[mergedHistory.length - 1].role === msg.role) {
        mergedHistory[mergedHistory.length - 1].parts[0].text += `\n\n${msg.parts[0].text}`;
      } else {
        mergedHistory.push(msg);
      }
    }

    if (
      mergedHistory.length > 0 &&
      mergedHistory[mergedHistory.length - 1].role === MessageRole.USER
    ) {
      const lastUserMsg = mergedHistory.pop();
      userMessage = `${lastUserMsg?.parts[0].text}\n\n${userMessage}`;
    }

    const chat = model.startChat({
      history: mergedHistory,
      generationConfig: GENERATION_CONFIG,
    });

    const result = await chat.sendMessage(userMessage);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    return text;
  } catch (error) {
    console.error("Error generating chat response:", error);

    // Xử lý lỗi tinh tế hơn để trả về Frontend
    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("quota")) {
        throw new Error("Hệ thống đang quá tải, vui lòng thử lại sau giây lát.");
      }
      if (error.message.includes("SAFETY")) {
        throw new Error("Tin nhắn của bạn vi phạm tiêu chuẩn an toàn cộng đồng.");
      }
    }

    throw new Error("Đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại.");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { sleep };
