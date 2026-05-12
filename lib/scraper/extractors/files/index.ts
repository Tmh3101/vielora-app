import path from "node:path";
import { extractFromPDF } from "./pdf-extractor";
import { extractFromDOCX } from "./docx-extractor";

function normalizeText(text: string): string {
  return text.split("\0").join("").trim();
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<string> {
  const extension = path.extname(filename).toLowerCase();

  let rawText = "";
  switch (extension) {
    case ".pdf":
      rawText = await extractFromPDF(buffer, filename);
      break;
    case ".docx":
      rawText = await extractFromDOCX(buffer);
      break;
    case ".txt":
    case ".csv":
    case ".md":
      rawText = buffer.toString("utf-8");
      break;
    default:
      if (mimeType?.startsWith("text/")) {
        rawText = buffer.toString("utf-8");
        break;
      }
      throw new Error(`Unsupported file format: ${extension || "unknown"}`);
  }

  const normalized = normalizeText(rawText);
  if (!normalized) {
    throw new Error("No extractable text found in the uploaded file");
  }

  return normalized;
}
