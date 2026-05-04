import { generateEmbedding } from "@/lib/rag/generative";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { getFallbackPagesServer } from "@/lib/services/page.service";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { MAX_DOCS_RETRIEVAL, FULL_TEXT_WEIGHT, SEMANTIC_WEIGHT } from "@/config";

const createResultDocs = (content: string, title?: string, url?: string) => {
  return `### ${title || "Tài liệu"}\nURL: ${url || "N/A"}\n${content}`;
};

// Hàm helper xử lý Fallback (Dùng khi RAG lỗi)
const getFallbackPages = async (botId: string, supabase: SupabaseClient<Database>) => {
  console.warn(`[RAG Fallback] Falling back to basic page retrieval for botId: ${botId}`);
  try {
    const pages = await getFallbackPagesServer(supabase, botId, MAX_DOCS_RETRIEVAL);
    if (pages.length === 0) return "";
    return pages
      .map((p) => createResultDocs(p.content?.slice(0, 1500), p.title, p.url))
      .join("\n\n---\n\n");
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

    const { data: relevantDocs, error: searchError } = (await supabase.rpc("hybrid_search", {
      query_text: message,
      query_embedding: `[${queryEmbedding.join(",")}]`,
      match_count: MAX_DOCS_RETRIEVAL,
      full_text_weight: FULL_TEXT_WEIGHT,
      semantic_weight: SEMANTIC_WEIGHT,
      p_bot_id: botId,
    })) as {
      data: Array<{
        content: string;
        metadata: { url?: string; title?: string };
        similarity: number;
      }> | null;
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
        .map((doc) => {
          const meta = doc.metadata || {};
          return createResultDocs(doc.content, meta.title, meta.url);
        })
        .join("\n\n---\n\n");
    }

    // Trả về chuỗi rỗng nếu không tìm thấy bất kỳ chunk nào phù hợp
    return "";
  } catch (error) {
    console.error("[RAG Error] System error during retrieval:", error);
    return await getFallbackPages(botId, supabase);
  }
}
