import { generateBatchEmbeddings } from "@/lib/rag/generative";
import { PageContent } from "@/types";
import {
  CHUNK_SIZE,
  CHUNK_OVERLAP,
  MIN_CHUNK_SIZE,
  BATCH_SIZE,
  MAX_RETRIES,
  INITIAL_BACKOFF_MS,
} from "@/config";
import { chunkArray } from "@/lib/utils/array-helpers";
import { sleep } from "@/lib/utils/sleep";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export interface DocumentChunk {
  content: string;
  metadata: {
    url: string;
    title: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface ProcessedDocument {
  content: string;
  metadata: {
    url: string;
    title: string;
    chunkIndex: number;
    totalChunks: number;
  };
  embedding: number[];
}

const SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""];

/**
 * Split text using sliding window & recursive separators (LangChain style)
 */
function splitText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): string[] {
  if (!text || text.trim().length === 0) return [];

  const chunks: string[] = [];

  function split(textToSplit: string, separatorIndex: number) {
    if (separatorIndex >= SEPARATORS.length || textToSplit.length <= chunkSize) {
      if (textToSplit.length > 0) chunks.push(textToSplit);
      return;
    }

    const separator = SEPARATORS[separatorIndex];
    const splits = separator ? textToSplit.split(separator) : [textToSplit];

    if (splits.length === 1) {
      split(textToSplit, separatorIndex + 1);
      return;
    }

    let currentChunk: string[] = [];
    let currentLength = 0;

    for (let i = 0; i < splits.length; i++) {
      const piece = splits[i];
      const pieceLength = piece.length + (currentChunk.length > 0 ? separator.length : 0);

      if (currentLength + pieceLength > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join(separator));

        // OVERLAP handling: Start the new chunk with the last few pieces of the current chunk
        let overlapLength = 0;
        const newChunk: string[] = [];

        for (let j = currentChunk.length - 1; j >= 0; j--) {
          const overlapPieceLength =
            currentChunk[j].length + (newChunk.length > 0 ? separator.length : 0);
          if (overlapLength + overlapPieceLength > overlap) break;
          newChunk.unshift(currentChunk[j]);
          overlapLength += overlapPieceLength;
        }

        currentChunk = newChunk;
        currentLength = overlapLength;
      }

      if (piece.length > chunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(separator));
          currentChunk = [];
          currentLength = 0;
        }
        split(piece, separatorIndex + 1);
      } else {
        currentChunk.push(piece);
        currentLength += piece.length + (currentChunk.length > 1 ? separator.length : 0);
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(separator));
    }
  }

  split(text.trim(), 0);
  return chunks;
}

/**
 * Clean and preprocess markdown content safely
 */
function preprocessMarkdown(markdown: string): string {
  if (!markdown) return "";

  return markdown
    .replace(/\n{3,}/g, "\n\n") // Reduce excessive blank lines
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // Remove Markdown images but keep alt text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove Markdown links but keep link text
    .replace(/ {2,}/g, " ") // Remove excessive spaces
    .trim();
}

/**
 * Create document chunks from page content
 */
export function createChunks(pages: PageContent[]): DocumentChunk[] {
  const allChunks: DocumentChunk[] = [];

  for (const page of pages) {
    const cleanedContent = preprocessMarkdown(page.content);

    if (!cleanedContent || cleanedContent.length < MIN_CHUNK_SIZE) {
      console.log(
        `[RAG Info] Skipping page ${page.url} because the content is too short (< ${MIN_CHUNK_SIZE} chars)`
      );
      continue;
    }

    const textChunks = splitText(cleanedContent);
    const validChunks = textChunks.filter((chunk) => chunk.length >= MIN_CHUNK_SIZE);

    for (let i = 0; i < validChunks.length; i++) {
      allChunks.push({
        content: validChunks[i],
        metadata: {
          url: page.url,
          title: page.title,
          chunkIndex: i,
          totalChunks: validChunks.length,
        },
      });
    }
  }

  return allChunks;
}

/**
 * Process chunks and create embeddings with rate limiting using Google Gemini
 * IMPORTANT: Batch requests to reduce API calls and retry internally on rate limits.
 */
export async function embedChunks(chunks: DocumentChunk[]): Promise<ProcessedDocument[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  if (chunks.length === 0) {
    return [];
  }

  const chunkBatches = chunkArray(chunks, BATCH_SIZE);
  const embeddings: number[][] = [];

  for (let batchIndex = 0; batchIndex < chunkBatches.length; batchIndex++) {
    const batch = chunkBatches[batchIndex];
    const batchTexts = batch.map((chunk) => chunk.content);
    const batchDocumentTitle = batch.length === 1 ? batch[0].metadata.title : undefined;

    console.log(
      `Processing embedding batch ${batchIndex + 1}/${chunkBatches.length} (${batch.length} chunks)`
    );

    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const batchEmbeddings = await generateBatchEmbeddings(batchTexts, batchDocumentTitle);
        embeddings.push(...batchEmbeddings);

        if (batchIndex < chunkBatches.length - 1) {
          await sleep(1000);
        }

        break;
      } catch (error) {
        retries += 1;

        if (isRateLimitError(error) && retries < MAX_RETRIES) {
          // Try to extract the suggested wait time from the Google error message
          // Example: "Please retry in 13.315727224s" or "retryDelay: '13s'"
          let backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, retries - 1);
          const errorMsg = error instanceof Error ? error.message : String(error);

          const retryMatch =
            errorMsg.match(/retry in (\d+(?:\.\d+)?)s/i) ||
            errorMsg.match(/retryDelay["']?:\s*["']?(\d+(?:\.\d+)?)s/i);

          if (retryMatch && retryMatch[1]) {
            const apiSuggestedDelayMs = parseFloat(retryMatch[1]) * 1000;
            // Use API suggestion + 1.5s buffer, but at least as much as our exponential backoff
            backoffTime = Math.max(backoffTime, apiSuggestedDelayMs + 1500);
          }

          console.warn(
            `Rate limit hit for batch ${batchIndex + 1}. Retrying in ${Math.round(backoffTime)}ms (${retries}/${MAX_RETRIES})`
          );

          await sleep(backoffTime);
          continue;
        }

        console.error(`Error processing embedding batch ${batchIndex + 1}:`, error);
        throw error;
      }
    }
  }

  if (embeddings.length !== chunks.length) {
    throw new Error(
      `Processed embedding count mismatch: expected ${chunks.length}, received ${embeddings.length}`
    );
  }

  return chunks.map((chunk, index) => ({
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: embeddings[index],
  }));
}

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("429") || message.includes("quota");
}
