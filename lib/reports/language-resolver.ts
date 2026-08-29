import { WorkspaceBranding } from "./branding-provider";
import { generateText } from "@/lib/ai/generative";

/**
 * Resolves the effective language for a report:
 * Returns requestedLanguage if supported by workspace branding, otherwise falls back to branding.defaultLanguage.
 */
export function resolveReportLanguage(
  branding: WorkspaceBranding,
  requestedLanguage: string
): string {
  if (branding.supportedLanguages && branding.supportedLanguages.includes(requestedLanguage)) {
    return requestedLanguage;
  }
  return branding.defaultLanguage || "vi";
}

/**
 * Translates dynamic report section content via Gemini.
 * Returns the original content unchanged if targetLanguage is 'vi' or content is empty.
 */
export async function translateReportSection(
  sectionContent: string,
  targetLanguage: string
): Promise<string> {
  if (!sectionContent || !sectionContent.trim() || targetLanguage === "vi") {
    return sectionContent;
  }

  const prompt = `Translate the following report content to ${targetLanguage === "ar" ? "Arabic" : "English"}.
Important: preserve all formatting, bullet points, and professional tone. Do not add commentary.
Content:
${sectionContent}`;

  return generateText(prompt);
}

/**
 * Translates dynamic content fields within a report data object in a single batch LLM call.
 * This prevents concurrent rate-limit errors (503 Service Unavailable) and speeds up generation 10x.
 */
export async function translateReportData<T extends Record<string, unknown>>(
  data: T,
  targetLanguage: string
): Promise<T> {
  if (targetLanguage === "vi" || !data) {
    return data;
  }

  const targetLangName = targetLanguage === "ar" ? "Arabic" : "English";

  // Build isolated payload of translatable data fields
  const translatablePayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      key === "botIdentity" ||
      key === "hasData" ||
      key === "exportDate" ||
      key === "documentsCount" ||
      key === "topicTrends"
    ) {
      continue;
    }
    translatablePayload[key] = value;
  }

  const prompt = `You are a professional enterprise translator. Translate the human-readable textual values inside the following JSON data structure into ${targetLangName}.

STRICT RULES:
1. Preserve all JSON structure, keys, numbers, and punctuation.
2. Only translate human-readable string values (e.g. descriptions, summary text, titles, topics, table cells, radar axes such as "Độ bao phủ", "Tính chính xác").
3. Do NOT translate keys, numbers, IDs, dates, or numeric delta strings like "+0.4", "-0.2".
4. Return ONLY valid JSON wrapped in \`\`\`json ... \`\`\` without any explanations or additional text.

JSON TO TRANSLATE:
${JSON.stringify(translatablePayload, null, 2)}`;

  try {
    const rawResult = await generateText(prompt, { temperature: 0.1 });
    const cleaned = rawResult.trim();
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonStr = match ? match[1] : cleaned;
    const translatedPayload = JSON.parse(jsonStr) as Record<string, unknown>;

    return {
      ...data,
      ...translatedPayload,
    };
  } catch (err) {
    console.warn(
      `[translateReportData] Batch translation error for ${targetLanguage}, preserving original text:`,
      err
    );
    return data;
  }
}
