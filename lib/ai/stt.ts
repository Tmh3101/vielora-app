import { GoogleGenerativeAI } from "@google/generative-ai";
import { VOICE_STT_SYSTEM_PROMPT } from "@/lib/ai/prompt";

export interface TranscribeAudioOptions {
  base64Audio: string;
  mimeType: string;
}

/**
 * Transcribe speech audio to text using Gemini Multimodal API
 */
export async function transcribeAudio({
  base64Audio,
  mimeType,
}: TranscribeAudioOptions): Promise<string> {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  const cleanMimeType = (mimeType || "audio/webm").split(";")[0].trim() || "audio/webm";
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const sttModel = process.env.STT_MODEL || "gemini-1.5-flash";

  const model = genAI.getGenerativeModel({
    model: sttModel,
    systemInstruction: VOICE_STT_SYSTEM_PROMPT,
  });

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: cleanMimeType,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
    },
  });

  let textResult = response.response.text().trim();

  // Clean surrounding quotes if any
  textResult = textResult.replace(/^["'„«»]+|["'„«»]+$/g, "").trim();

  // Guard check if model echoed system instructions or prompt
  if (
    textResult.includes("You are a professional") ||
    textResult.includes("Speech-to-Text") ||
    textResult.includes("Strict constraints:") ||
    textResult.includes("Bạn là một hệ thống")
  ) {
    textResult = "";
  }

  return textResult;
}
