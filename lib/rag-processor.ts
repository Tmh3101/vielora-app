import { generateEmbedding, sleep } from "@/lib/rag/generative";
import { PageContent } from "@/types";
import { CHUNK_SIZE, CHUNK_OVERLAP, RATE_LIMIT_DELAY, MIN_CHUNK_SIZE } from "@/config";

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
    .replace(/\n{3,}/g, "\n\n") // Giảm thiểu khoảng trắng thừa
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // Bỏ ảnh Markdown, giữ Alt text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Bỏ link Markdown, giữ Text
    .replace(/ {2,}/g, " ") // Xóa khoảng trắng thừa
    .trim();
}

/**
 * Create document chunks from page content
 */
export function createChunks(pages: PageContent[]): DocumentChunk[] {
  const allChunks: DocumentChunk[] = [];

  for (const page of pages) {
    const cleanedContent = preprocessMarkdown(page.content);

    // FIXED: Bỏ qua thực sự chứ không push rác vào database
    if (!cleanedContent || cleanedContent.length < MIN_CHUNK_SIZE) {
      console.log(
        `[RAG Info] Bỏ qua trang ${page.url} vì nội dung quá ngắn (< ${MIN_CHUNK_SIZE} chars)`
      );
      continue;
    }

    const textChunks = splitText(cleanedContent);

    // Lọc lại một lần nữa để chắc chắn không có chunk rác nào lọt lưới
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
 * IMPORTANT: Implements delay between each request to avoid 429 errors on Free Tier
 */
export async function embedChunks(chunks: DocumentChunk[]): Promise<ProcessedDocument[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  const processedDocuments: ProcessedDocument[] = [];

  // Process one at a time with delay to respect Google Free Tier rate limits (15 RPM)
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    console.log(`Processing embedding ${i + 1}/${chunks.length}: ${chunk.metadata.url}`);

    try {
      const embedding = await generateEmbedding({
        text: chunk.content,
        isQuery: false,
        documentTitle: chunk.metadata.title,
      });

      processedDocuments.push({
        content: chunk.content,
        metadata: chunk.metadata,
        embedding,
      });

      // CRITICAL: Add delay between requests to avoid rate limiting
      if (i < chunks.length - 1) {
        await sleep(RATE_LIMIT_DELAY);
      }
    } catch (error) {
      console.error(`Error processing chunk ${i}:`, error);

      // If rate limited, wait longer and retry
      if (error instanceof Error && error.message.includes("429")) {
        console.log("Rate limited, waiting 60 seconds before retry...");
        await sleep(30000); // Wait 30 seconds
        i--; // Retry this chunk
        continue;
      }

      throw error;
    }
  }

  return processedDocuments;
}
