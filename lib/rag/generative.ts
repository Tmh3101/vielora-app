import {
  GoogleGenerativeAI,
  TaskType,
  type BatchEmbedContentsResponse,
  type EmbedContentRequest,
} from "@google/generative-ai";
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

type EmbedContentRequestWithOutputDimensionality = EmbedContentRequest & {
  outputDimensionality: number;
};

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

export async function generateBatchEmbeddings(
  texts: string[],
  documentTitle?: string
): Promise<number[][]> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  if (texts.length === 0) {
    return [];
  }

  const sanitizedTexts = texts.map((text, index) => {
    if (!text || text.trim().length === 0) {
      throw new Error(`Text at index ${index} cannot be empty`);
    }

    return text;
  });

  try {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const requests: EmbedContentRequestWithOutputDimensionality[] = sanitizedTexts.map((text) => ({
      content: { parts: [{ text }], role: MessageRole.USER },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      ...(documentTitle && { title: documentTitle }),
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }));

    const result: BatchEmbedContentsResponse = await model.batchEmbedContents({ requests });
    const embeddings = result.embeddings.map((embedding, index) => {
      const values = embedding.values;

      if (!values || values.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Unexpected embedding dimension at batch index ${index}: ${values?.length}`
        );
      }

      return values;
    });

    if (embeddings.length !== sanitizedTexts.length) {
      throw new Error(
        `Embedding count mismatch: expected ${sanitizedTexts.length}, received ${embeddings.length}`
      );
    }

    return embeddings;
  } catch (error) {
    console.error("Error generating batch embeddings:", error);
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
