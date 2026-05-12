import pdfParse from "pdf-parse";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import {
  PDF_FALLBACK_MODEL,
  PDF_FALLBACK_TIMEOUT_MS,
  PDF_FALLBACK_MIN_TEXT_LENGTH,
} from "@/config/knowledge";
import { PDF_FALLBACK_PROMPT } from "@/lib/ai/prompt";

function shouldFallback(text: string, error?: unknown): boolean {
  if (error) return true;
  return text.trim().length < PDF_FALLBACK_MIN_TEXT_LENGTH;
}

export async function extractFromPDF(buffer: Buffer, filename?: string): Promise<string> {
  try {
    const result = await pdfParse(buffer);
    const extractedText = result.text ?? "";

    if (!shouldFallback(extractedText)) {
      return extractedText;
    }

    return await fallbackExtractPDF(buffer, filename);
  } catch {
    return await fallbackExtractPDF(buffer, filename);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`PDF fallback extraction timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => resolve(result))
      .catch((error: unknown) => reject(error))
      .finally(() => clearTimeout(timeoutId));
  });
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

export async function fallbackExtractPDF(
  buffer: Buffer,
  filename = "document.pdf"
): Promise<string> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  const tempFileName = `${Date.now()}-${randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  try {
    await fs.writeFile(tempFilePath, buffer);

    const fileManager = new GoogleAIFileManager(GOOGLE_API_KEY);
    const uploadResult = await withTimeout(
      fileManager.uploadFile(tempFilePath, {
        mimeType: "application/pdf",
        displayName: tempFileName,
      }),
      PDF_FALLBACK_TIMEOUT_MS
    );

    const file = uploadResult.file;
    if (!file?.uri) {
      throw new Error("Failed to upload PDF for fallback extraction");
    }

    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: PDF_FALLBACK_MODEL });

    const result = await withTimeout(
      model.generateContent([
        PDF_FALLBACK_PROMPT,
        {
          fileData: {
            fileUri: file.uri,
            mimeType: file.mimeType || "application/pdf",
          },
        },
      ]),
      PDF_FALLBACK_TIMEOUT_MS
    );

    const text = result.response.text().trim();
    if (!text) {
      throw new Error("Empty response from PDF fallback extraction");
    }

    console.info("[PDFExtractor] fallbackExtractPDF used", {
      filename,
      model: PDF_FALLBACK_MODEL,
      timeoutMs: PDF_FALLBACK_TIMEOUT_MS,
      uploadedFileName: file.name,
    });

    return text;
  } catch (error) {
    console.error("[PDFExtractor] fallbackExtractPDF failed", {
      filename,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await fs.unlink(tempFilePath).catch((unlinkError: unknown) => {
      console.warn("[PDFExtractor] Failed to remove temp PDF file", {
        tempFilePath,
        error: unlinkError instanceof Error ? unlinkError.message : String(unlinkError),
      });
    });
  }
}
