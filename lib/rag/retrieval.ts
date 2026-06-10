import { generateEmbedding } from "@/lib/rag/generative";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { getFallbackPagesServer } from "@/lib/services/page.service";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { MAX_DOCS_RETRIEVAL, FULL_TEXT_WEIGHT, SEMANTIC_WEIGHT } from "@/config";
import { EPageSourceType } from "@/types/enums";
import { HYBRID_SEARCH_FUNC_NAME } from "@/lib/constants/rag";

export interface HybridSearchRow {
  id: string;
  bot_id: string;
  content: string;
  metadata: {
    url?: string;
    title?: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
  similarity: number;
  source_type: EPageSourceType;
  resolved_url: string | null;
}

type RetrievedChunk = Pick<
  HybridSearchRow,
  "content" | "metadata" | "source_type" | "resolved_url"
>;

const URL_SOURCE_TYPES = new Set<HybridSearchRow["source_type"]>([
  EPageSourceType.Website,
  EPageSourceType.SingleUrl,
]);

const FILE_SOURCE_TYPES = new Set<HybridSearchRow["source_type"]>([
  EPageSourceType.File,
  EPageSourceType.ManualText,
]);

const escapeAttributeValue = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const getFileNameFromPath = (value?: string | null) => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const withoutQuery = trimmed.split(/[?#]/)[0];
  const normalized = withoutQuery.replace(/^file:\/\//i, "");
  const parts = normalized.split("/").filter(Boolean);
  return parts.at(-1) || normalized || null;
};

const getChunkLabel = (metadata?: RetrievedChunk["metadata"] | null) => {
  return metadata?.title?.trim() || getFileNameFromPath(metadata?.url) || "document";
};

export const serializeRetrievedChunk = (chunk: RetrievedChunk) => {
  const content = chunk.content?.trim();
  if (!content) return "";

  if (URL_SOURCE_TYPES.has(chunk.source_type)) {
    const resolvedUrl = (chunk.resolved_url || chunk.metadata?.url || "").trim();
    if (!resolvedUrl) return "";

    return `<c s="url" u="${escapeAttributeValue(resolvedUrl)}">${content}</c>`;
  }

  if (FILE_SOURCE_TYPES.has(chunk.source_type)) {
    const fileName = getChunkLabel(chunk.metadata);
    return `<c s="file" n="${escapeAttributeValue(fileName)}">${content}</c>`;
  }

  return "";
};

export const serializeRetrievedContext = (chunks: RetrievedChunk[]) =>
  chunks.map(serializeRetrievedChunk).filter(Boolean).join("\n");

// Hàm helper xử lý Fallback (Dùng khi RAG lỗi)
const getFallbackPages = async (botId: string, supabase: SupabaseClient<Database>) => {
  console.warn(`[RAG Fallback] Falling back to basic page retrieval for botId: ${botId}`);
  try {
    const pages = await getFallbackPagesServer(supabase, botId, MAX_DOCS_RETRIEVAL);
    if (pages.length === 0) return "";

    return serializeRetrievedContext(
      pages.map((page) => ({
        content: page.content?.slice(0, 1500) || "",
        metadata: {
          title: page.title,
          url: page.url,
        },
        source_type: page.url?.startsWith("file://")
          ? EPageSourceType.File
          : EPageSourceType.Website,
        resolved_url: page.url || null,
      }))
    );
  } catch {
    return "";
  }
};

export async function hybridRetrival(message: string, botId: string): Promise<string> {
  const supabase = createAdminClient();

  try {
    const queryEmbedding = await generateEmbedding({
      text: message,
      isQuery: true,
    });

    const { data: relevantDocs, error: searchError } = (await supabase.rpc(
      HYBRID_SEARCH_FUNC_NAME,
      {
        query_text: message,
        query_embedding: `[${queryEmbedding.join(",")}]`,
        match_count: MAX_DOCS_RETRIEVAL,
        full_text_weight: FULL_TEXT_WEIGHT,
        semantic_weight: SEMANTIC_WEIGHT,
        p_bot_id: botId,
      }
    )) as {
      data: HybridSearchRow[] | null;
      error: PostgrestError | null;
    };

    if (searchError) {
      console.error("[RAG Error] Error occurred while executing hybrid_search:", searchError);
      return await getFallbackPages(botId, supabase);
    }

    if (relevantDocs && relevantDocs.length > 0) {
      relevantDocs.forEach((doc, index) => {
        console.log(
          `[RAG Match] Top ${index + 1} (Score: ${doc.similarity.toFixed(4)}):`,
          doc.metadata.title
        );
      });

      return relevantDocs
        .map((doc) => serializeRetrievedChunk(doc))
        .filter(Boolean)
        .join("\n");
    }

    // Trả về chuỗi rỗng nếu không tìm thấy bất kỳ chunk nào phù hợp
    return "";
  } catch (error) {
    console.error("[RAG Error] System error during retrieval:", error);
    return await getFallbackPages(botId, supabase);
  }
}
