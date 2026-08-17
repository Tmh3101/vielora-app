/* eslint-disable @typescript-eslint/no-explicit-any */
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createAdminClient } from "@/lib/supabase/server";
import { generateChatResponse, generateEmbedding } from "@/lib/rag/generative";
import { GROUP_CHAT_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { EGroupSenderType } from "@/types";

const TARGET_BOT_ID = "eadb9789-6353-4df2-a44e-a56687bb4662";

async function testGroupSummary() {
  console.log("=== Bắt đầu Test Tổng hợp Hội thoại Nhóm ===");
  console.log("Target Bot ID:", TARGET_BOT_ID);

  const adminClient = createAdminClient();

  // 1. Fetch group for bot
  const { data: group, error: groupErr } = await (adminClient as any)
    .from("group_chats")
    .select("id, bot_id, status")
    .eq("bot_id", TARGET_BOT_ID)
    .maybeSingle();

  if (groupErr || !group) {
    console.error("❌ Không tìm thấy nhóm chat cho bot này:", groupErr);
    return;
  }

  console.log(`✅ Tìm thấy nhóm chat: ID=${group.id}, Status=${group.status}`);

  // 2. Fetch messages
  const windowEnd = new Date();
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { data: messages24h, error: msgErr } = await (adminClient as any)
    .from("group_messages")
    .select("id, content, sender_type, created_at, deleted_at")
    .eq("group_id", group.id)
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString())
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (msgErr) {
    console.error("❌ Lỗi lấy tin nhắn 24h:", msgErr);
    return;
  }

  console.log(`📊 Số lượng tin nhắn trong 24h qua: ${messages24h?.length || 0}`);

  let messagesToSummarize = messages24h || [];

  if (messagesToSummarize.length < 2) {
    console.log(
      "⚠️ Tin nhắn 24h qua < 2. Đang kiểm tra toàn bộ tin nhắn gần nhất của nhóm để test..."
    );
    const { data: allMessages } = await (adminClient as any)
      .from("group_messages")
      .select("id, content, sender_type, created_at, deleted_at")
      .eq("group_id", group.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!allMessages || allMessages.length < 2) {
      console.log(
        "⚠️ Nhóm hiện có ít hơn 2 tin nhắn. Đang tạo 2 tin nhắn mẫu để test tính năng tổng hợp..."
      );

      const { data: m1 } = await (adminClient as any)
        .from("group_messages")
        .insert({
          group_id: group.id,
          sender_type: EGroupSenderType.User,
          sender_id: null,
          content: "Chào bot, bên mình có chính sách hoàn tiền trong vòng bao nhiêu ngày vậy?",
        })
        .select()
        .single();

      const { data: m2 } = await (adminClient as any)
        .from("group_messages")
        .insert({
          group_id: group.id,
          sender_type: EGroupSenderType.Bot,
          sender_id: null,
          content:
            "Dạ bên em hỗ trợ hoàn tiền 100% trong vòng 7 ngày kể từ ngày đăng ký dịch vụ nếu anh chị chưa sử dụng quá 20% credits ạ.",
        })
        .select()
        .single();

      messagesToSummarize = [m1, m2];
    } else {
      messagesToSummarize = allMessages.reverse();
    }
  }

  console.log(`📝 Bắt đầu tổng hợp từ ${messagesToSummarize.length} tin nhắn...`);

  // Build transcript text
  const transcript = messagesToSummarize
    .map(
      (m: { created_at: string; sender_type: string; content: string }) =>
        `[${(m.created_at || new Date().toISOString()).substring(11, 16)}] ${
          m.sender_type === EGroupSenderType.Bot ? "Bot" : "Thành viên"
        }: ${m.content}`
    )
    .join("\n");

  console.log("\n--- Transcript đầu vào ---");
  console.log(transcript);

  // 3. Call LLM to generate summary
  console.log("\n🤖 Đang gọi Gemini LLM để tổng hợp...");
  const summaryText = await generateChatResponse(GROUP_CHAT_SUMMARY_SYSTEM_PROMPT, transcript, []);

  console.log("\n--- Kết Quả Tổng Hợp (Insight Summary) ---");
  console.log(summaryText);

  // 4. Index into documents table for RAG first to get document_id
  const dateKey = windowStart.toISOString().split("T")[0];
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

  console.log("\n🧬 Đang tạo Vector Embedding cho bản tổng hợp...");
  const embedding = await generateEmbedding({ text: summaryContentToEmbed });
  console.log(`✅ Đã tạo embedding (${embedding.length} chiều).`);

  const { data: botData } = await (adminClient as any)
    .from("bots")
    .select("workspace_id")
    .eq("id", TARGET_BOT_ID)
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

  const { data: existingDoc } = await (adminClient as any)
    .from("documents")
    .select("id")
    .eq("bot_id", TARGET_BOT_ID)
    .filter("metadata->>source", "eq", "daily_group_summary")
    .maybeSingle();

  let documentId: string | null = null;
  if (existingDoc) {
    documentId = existingDoc.id;
    await (adminClient as any)
      .from("documents")
      .update({
        content: summaryContentToEmbed,
        embedding: `[${embedding.join(",")}]`,
        metadata: docMetadata,
      })
      .eq("id", existingDoc.id);
    console.log(`✅ Đã cập nhật RAG Document trong bảng documents (ID: ${existingDoc.id})`);
  } else {
    const { data: newDoc, error: insertDocErr } = await (adminClient as any)
      .from("documents")
      .insert({
        bot_id: TARGET_BOT_ID,
        workspace_id: botData?.workspace_id ?? null,
        content: summaryContentToEmbed,
        embedding: `[${embedding.join(",")}]`,
        metadata: docMetadata,
      })
      .select("id")
      .single();

    if (!insertDocErr && newDoc) {
      documentId = newDoc.id;
      console.log(`✅ Đã thêm mới RAG Document vào bảng documents (ID: ${documentId})`);
    } else {
      console.error("❌ Lỗi thêm RAG Document:", insertDocErr);
    }
  }

  // 5. Upsert into group_chat_insights
  const { data: upsertedInsight, error: insightErr } = await (adminClient as any)
    .from("group_chat_insights")
    .upsert({
      bot_id: TARGET_BOT_ID,
      group_id: group.id,
      summary: summaryText,
      document_id: documentId,
      last_summarized_message_at: windowEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insightErr) {
    console.error("❌ Lỗi khi upsert vào bảng group_chat_insights:", insightErr);
  } else {
    console.log(`\n✅ Đã lưu thành công vào bảng group_chat_insights:`, upsertedInsight);
  }

  console.log("\n🎉 HOÀN TẤT TEST TỔNG HỢP TỰ ĐỘNG CHO BOT!");
}

testGroupSummary().catch((err) => {
  console.error("❌ Lỗi thực thi:", err);
  process.exit(1);
});
