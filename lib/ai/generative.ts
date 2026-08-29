import { GoogleGenerativeAI } from "@google/generative-ai";
import { EMessageRole } from "@/types";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const CHAT_MODEL = process.env.CHAT_MODEL || "gemini-2.5-flash-lite";

export interface GenerateTextOptions {
  systemInstruction?: string;
  model?: string;
  temperature?: number;
}

/**
 * Generate text using Google Gemini Generative AI SDK
 */
export async function generateText(prompt: string, options?: GenerateTextOptions): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY || GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = options?.model || process.env.TRANSLATION_MODEL || CHAT_MODEL;

  const model = genAI.getGenerativeModel({
    model: modelName,
    ...(options?.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
  });

  const response = await model.generateContent({
    contents: [{ role: EMessageRole.User, parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.1,
    },
  });

  const textResult = response.response.text().trim();
  return textResult;
}
