import { generateChatResponse } from "@/lib/rag/generative";
import { GROUP_CHAT_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { EGroupChatStatus, EGroupSenderType } from "@/types";

export interface SummaryResult {
  totalGroups: number;
  summarized: number;
  skipped: number;
  errors: number;
}

export type GroupSummaryResult = SummaryResult;

export async function generateDailyGroupSummaries(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any
): Promise<SummaryResult> {
  const result: SummaryResult = {
    totalGroups: 0,
    summarized: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // 1. Fetch active groups
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: activeGroups, error: groupErr } = await (client as any)
      .from("group_chats")
      .select("id, bot_id")
      .eq("status", EGroupChatStatus.Active);

    if (groupErr || !activeGroups) {
      console.error("[GroupSummary] Error fetching active groups:", groupErr);
      return result;
    }

    result.totalGroups = activeGroups.length;
    const windowEnd = new Date();
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const group of activeGroups) {
      try {
        // Fetch last 24h messages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: messages, error: msgErr } = await (client as any)
          .from("group_messages")
          .select("content, sender_type, created_at")
          .eq("group_id", group.id)
          .gte("created_at", windowStart.toISOString())
          .lte("created_at", windowEnd.toISOString())
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .limit(30);

        if (msgErr || !messages || messages.length < 2) {
          result.skipped++;
          continue;
        }

        // Build transcript text
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transcript = messages
          .map(
            (m: { created_at: string; sender_type: string; content: string }) =>
              `[${m.created_at.substring(11, 16)}] ${
                m.sender_type === EGroupSenderType.Bot ? "Bot" : "Thành viên"
              }: ${m.content}`
          )
          .join("\n");

        const summaryText = await generateChatResponse(
          GROUP_CHAT_SUMMARY_SYSTEM_PROMPT,
          transcript,
          []
        );

        // 1. Vectorize & Index daily summary into documents table for RAG (Daily Journal approach)
        let documentId: string | null = null;
        try {
          const dateKey = windowStart.toISOString().split("T")[0]; // YYYY-MM-DD
          const formattedStart = windowStart.toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          const formattedEnd = windowEnd.toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          const summaryContentToEmbed = `[Bản tổng hợp hoạt động nhóm chat - Ngày ${dateKey}]\n- Khung thời gian: từ ${formattedStart} đến ${formattedEnd}\n- Tóm tắt các chủ đề thảo luận chính:\n${summaryText}`;

          const { generateEmbedding } = await import("@/lib/rag/generative");
          const embedding = await generateEmbedding({ text: summaryContentToEmbed });

          // Fetch bot's workspace_id
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: botData } = await (client as any)
            .from("bots")
            .select("workspace_id")
            .eq("id", group.bot_id)
            .single();

          const docMetadata = {
            source: "daily_group_summary",
            source_type: "manual_text",
            title: `Tổng hợp nhóm (${dateKey})`,
            group_id: group.id,
            date: dateKey,
            window_start: windowStart.toISOString(),
            window_end: windowEnd.toISOString(),
          };

          // Check if document exists for this bot (1 rolling document per bot)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existingDoc } = await (client as any)
            .from("documents")
            .select("id")
            .eq("bot_id", group.bot_id)
            .filter("metadata->>source", "eq", "daily_group_summary")
            .maybeSingle();

          if (existingDoc) {
            documentId = existingDoc.id;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (client as any)
              .from("documents")
              .update({
                content: summaryContentToEmbed,
                embedding: `[${embedding.join(",")}]`,
                metadata: docMetadata,
              })
              .eq("id", existingDoc.id);
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: newDoc, error: insertDocErr } = await (client as any)
              .from("documents")
              .insert({
                bot_id: group.bot_id,
                workspace_id: botData?.workspace_id ?? null,
                content: summaryContentToEmbed,
                embedding: `[${embedding.join(",")}]`,
                metadata: docMetadata,
              })
              .select("id")
              .single();

            if (!insertDocErr && newDoc) {
              documentId = newDoc.id;
            }
          }
        } catch (ragErr) {
          console.error(
            `[GroupSummary] Warning: Failed to index daily summary into documents for group ${group.id}:`,
            ragErr
          );
        }

        // 2. Upsert group_chat_insights with valid schema columns
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insightErr } = await (client as any).from("group_chat_insights").upsert({
          bot_id: group.bot_id,
          group_id: group.id,
          summary: summaryText,
          document_id: documentId,
          last_summarized_message_at: windowEnd.toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insightErr) {
          console.error(
            `[GroupSummary] Error upserting group_chat_insights for bot ${group.bot_id}:`,
            insightErr
          );
        }

        result.summarized++;
      } catch (err) {
        console.error(`[GroupSummary] Error processing group ${group.id}:`, err);
        result.errors++;
      }
    }
  } catch (err) {
    console.error("[GroupSummary] Fatal error running group summaries:", err);
  }

  return result;
}

export const processGroupChatSummaries = generateDailyGroupSummaries;
