import type { ServiceClient } from "@/lib/services/types";
import type { Tables } from "@/lib/supabase/types";
import { EMessageRole } from "@/types/enums";

export type ConversationRow = Tables<"conversations">;
export type MessageRow = Tables<"messages">;

export interface RecentQuestion {
  content: string;
  count: number;
}

export interface QuestionDetail {
  question: string;
  answer: string;
  timestamp: string;
}

/**
 * Đếm tổng số cuộc hội thoại trên nhiều bots.
 */
export async function getTotalConversationCount(
  client: ServiceClient,
  botIds: string[]
): Promise<number> {
  if (botIds.length === 0) return 0;
  const { count, error } = await client
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .in("bot_id", botIds);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Lấy N câu hỏi gần nhất của user cho một bot.
 */
export async function getRecentUserMessagesByBotId(
  client: ServiceClient,
  botId: string,
  limit = 5
): Promise<RecentQuestion[]> {
  const { data, error } = await client
    .from("messages")
    .select(
      `
      content,
      created_at,
      conversations!inner(bot_id)
    `
    )
    .eq("conversations.bot_id", botId)
    .eq("role", EMessageRole.User)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((msg, index) => ({
    content: msg.content,
    count: index + 1,
  }));
}

/**
 * Lấy chi tiết câu hỏi – câu trả lời theo nội dung câu hỏi khớp với botId.
 */
export async function getQuestionDetails(
  client: ServiceClient,
  botId: string,
  questionContent: string,
  limit = 5
): Promise<QuestionDetail[]> {
  const { data: userMessages, error } = await client
    .from("messages")
    .select(
      `
      content,
      role,
      created_at,
      conversation_id,
      conversations!inner(bot_id)
    `
    )
    .eq("conversations.bot_id", botId)
    .ilike("content", `%${questionContent}%`)
    .eq("role", EMessageRole.User)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const details = await Promise.all(
    (userMessages ?? []).map(async (userMsg) => {
      const { data: assistantResponse } = await client
        .from("messages")
        .select("content")
        .eq("conversation_id", userMsg.conversation_id)
        .eq("role", EMessageRole.Assistant)
        .gt("created_at", userMsg.created_at)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      return {
        question: userMsg.content,
        answer: assistantResponse?.content ?? "Không có phản hồi",
        timestamp: new Date(userMsg.created_at).toLocaleString("vi-VN"),
      };
    })
  );

  return details;
}

/**
 * Tạo cuộc hội thoại mới.
 */
export async function createConversation(
  client: ServiceClient,
  botId: string,
  visitorId: string
): Promise<ConversationRow> {
  const { data, error } = await client
    .from("conversations")
    .insert({ bot_id: botId, visitor_id: visitorId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to create conversation");
  return data as ConversationRow;
}

/**
 * Lưu một tin nhắn vào cuộc hội thoại.
 * @param noAnswer - Nếu true, đánh dấu tin nhắn là không có câu trả lời.
 */
export async function saveMessage(
  client: ServiceClient,
  conversationId: string,
  role: EMessageRole,
  content: string,
  noAnswer?: boolean
): Promise<void> {
  const { error } = await client.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
    ...(noAnswer !== undefined ? { no_answer: noAnswer } : {}),
  });

  if (error) throw new Error(error.message);
}

/**
 * Lấy danh sách tin nhắn trong hội thoại để làm context cho AI.
 */
export async function getMessagesForContext(
  client: ServiceClient,
  conversationId: string,
  limit: number
): Promise<Pick<MessageRow, "role" | "content">[]> {
  const { data, error } = await client
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as Pick<MessageRow, "role" | "content">[]).reverse();
}

/**
 * Tìm cuộc hội thoại đang hoạt động (chưa kết thúc) của visitor.
 * Trả về null nếu không tìm thấy.
 */
export async function findActiveConversation(
  client: ServiceClient,
  botId: string,
  visitorId: string
): Promise<Pick<ConversationRow, "id" | "started_at"> | null> {
  const { data } = await client
    .from("conversations")
    .select("id, started_at")
    .eq("bot_id", botId)
    .eq("visitor_id", visitorId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  return (data as Pick<ConversationRow, "id" | "started_at"> | null) ?? null;
}

/**
 * Lấy danh sách tin nhắn trong cuộc hội thoại (role, content, created_at).
 */
export async function getConversationMessages(
  client: ServiceClient,
  conversationId: string,
  limit = 50
): Promise<Pick<MessageRow, "role" | "content" | "created_at">[]> {
  const { data, error } = await client
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<MessageRow, "role" | "content" | "created_at">[];
}

/**
 * Kết thúc cuộc hội thoại (đặt ended_at = now).
 */
export async function endConversation(
  client: ServiceClient,
  conversationId: string
): Promise<void> {
  const { error } = await client
    .from("conversations")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) throw new Error(error.message);
}

/**
 * Lấy tất cả cuộc hội thoại (id + started_at) của một bot.
 * Dùng trong analytics service.
 */
export async function getConversationsByBotId(
  client: ServiceClient,
  botId: string
): Promise<Pick<ConversationRow, "id" | "started_at">[]> {
  const { data, error } = await client
    .from("conversations")
    .select("id, started_at")
    .eq("bot_id", botId);

  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<ConversationRow, "id" | "started_at">[];
}

/**
 * Lấy tất cả tin nhắn thuộc danh sách conversation IDs.
 * Dùng trong analytics service.
 */
export async function getMessagesByConversationIds(
  client: ServiceClient,
  conversationIds: string[]
): Promise<MessageRow[]> {
  if (conversationIds.length === 0) return [];
  const { data, error } = await client
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as MessageRow[];
}
