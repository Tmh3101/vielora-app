import type { ServiceClient } from "@/lib/services/types";
import { GROUP_ALREADY_PINNED_CODE, GROUP_INSUFFICIENT_CREDITS_CODE } from "@/lib/constants";
import { EGroupSenderType, ETransactionType } from "@/types/enums";
import { deductWorkspaceCredits, refundWorkspaceCredits } from "@/lib/services/credit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { GroupServiceError } from "@/types/group-chat";

export interface ChatKnowledgeRow {
  id: string;
  group_id: string;
  bot_id: string;
  message_id: string;
  question: string;
  answer: string;
  pinned_by: string;
  created_at: string;
}

export async function listPinnedKnowledge(
  client: ServiceClient,
  botId: string
): Promise<ChatKnowledgeRow[]> {
  const { data, error } = await client
    .from("chat_knowledge")
    .select("*")
    .eq("bot_id", botId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing pinned knowledge:", error);
    throw error;
  }

  return (data as ChatKnowledgeRow[]) || [];
}

export async function pinKnowledge(
  client: ServiceClient,
  params: {
    botId: string;
    messageId: string;
    userId: string;
  }
): Promise<ChatKnowledgeRow> {
  const { botId, messageId, userId } = params;

  // Check if already pinned
  const { data: existing } = await client
    .from("chat_knowledge")
    .select("id")
    .eq("message_id", messageId)
    .maybeSingle();

  if (existing) {
    throw new GroupServiceError(
      "Message is already pinned to knowledge base",
      GROUP_ALREADY_PINNED_CODE
    );
  }

  // Fetch message
  const { data: message, error: msgErr } = await client
    .from("group_messages")
    .select("*")
    .eq("id", messageId)
    .single();

  if (msgErr || !message) {
    throw new Error("Message not found");
  }

  let question = "";
  let answer = "";
  let questionerUserId: string | null = null;
  let questionTimestamp = message.created_at;

  if (message.sender_type === EGroupSenderType.Bot) {
    answer = message.content;
    if (message.reply_to_id) {
      const { data: parentMsg } = await client
        .from("group_messages")
        .select("content, sender_id, created_at")
        .eq("id", message.reply_to_id)
        .maybeSingle();

      question = parentMsg?.content || "Hỏi đáp nhóm chat";
      questionerUserId = parentMsg?.sender_id || null;
      if (parentMsg?.created_at) {
        questionTimestamp = parentMsg.created_at;
      }
    } else {
      question = "Hỏi đáp nhóm chat";
    }
  } else {
    question = message.content;
    questionerUserId = message.sender_id;
    questionTimestamp = message.created_at;

    // Find bot reply if any
    const { data: botReply } = await client
      .from("group_messages")
      .select("content")
      .eq("reply_to_id", messageId)
      .eq("sender_type", EGroupSenderType.Bot)
      .order("created_at", { ascending: false })
      .maybeSingle();

    answer = botReply?.content || "";
  }

  // Fetch questioner member profile
  let questionerName = "Thành viên nhóm";
  let questionerRole = "Thành viên";

  if (questionerUserId) {
    const { data: member } = await client
      .from("group_members")
      .select("role_label, email")
      .eq("group_id", message.group_id)
      .eq("user_id", questionerUserId)
      .maybeSingle();

    if (member?.role_label) {
      questionerRole = member.role_label;
    }

    try {
      const adminClient = createAdminClient();
      const { data: userData } = await adminClient.auth.admin.getUserById(questionerUserId);
      if (userData?.user) {
        const u = userData.user;
        questionerName =
          (u.user_metadata?.display_name as string) ||
          (u.user_metadata?.full_name as string) ||
          (u.user_metadata?.name as string) ||
          (member?.email ? member.email.split("@")[0] : "Thành viên nhóm");
      } else if (member?.email) {
        questionerName = member.email.split("@")[0];
      }
    } catch {
      if (member?.email) {
        questionerName = member.email.split("@")[0];
      }
    }
  }

  const formattedDate = new Date(questionTimestamp).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const contentToEmbed = `[Kiến thức hỏi đáp nhóm chat]\n- Người hỏi: ${questionerName} (Vai trò: ${questionerRole})\n- Thời gian: ${formattedDate}\n- Câu hỏi: ${question}\n- Câu trả lời: ${answer}`;

  // Fetch bot's workspace_id
  const { data: botData } = await client
    .from("bots")
    .select("workspace_id")
    .eq("id", botId)
    .single();

  if (!botData?.workspace_id) {
    throw new Error("Bot workspace not found");
  }

  // Deduct 1 credit for pinning knowledge
  const deductRes = await deductWorkspaceCredits(client, {
    workspaceId: botData.workspace_id,
    creditAmount: 1,
    transactionType: ETransactionType.AddKnowledge,
    transactionDescription: `Pin group chat message to knowledge (${messageId.slice(0, 8)})`,
  });

  if (!deductRes.success) {
    throw new GroupServiceError(
      deductRes.message || "Insufficient workspace credits to pin message.",
      GROUP_INSUFFICIENT_CREDITS_CODE
    );
  }

  try {
    // 1. Insert chat_knowledge
    const { data: knowledge, error: kErr } = await client
      .from("chat_knowledge")
      .insert({
        group_id: message.group_id,
        bot_id: botId,
        message_id: messageId,
        question,
        answer,
        pinned_by: userId,
      })
      .select("*")
      .single();

    if (kErr || !knowledge) {
      console.error("Error inserting chat_knowledge:", kErr);
      throw kErr;
    }

    // 2. Generate embedding & insert into documents table for RAG indexing
    try {
      const { generateEmbedding } = await import("@/lib/rag/generative");
      const embedding = await generateEmbedding({ text: contentToEmbed });

      await client.from("documents").insert({
        bot_id: botId,
        workspace_id: botData.workspace_id,
        content: contentToEmbed,
        embedding: `[${embedding.join(",")}]`,
        metadata: {
          source: "chat_pin",
          source_type: "manual_text",
          title: `Hỏi đáp nhóm (${questionerName} - ${formattedDate})`,
          chat_knowledge_id: knowledge.id,
          message_id: messageId,
          questioner_name: questionerName,
          questioner_role: questionerRole,
          asked_at: questionTimestamp,
          question,
          answer,
        },
      });
    } catch (embErr) {
      console.error("Warning: Failed to generate document embedding for pinned knowledge:", embErr);
    }

    return knowledge as ChatKnowledgeRow;
  } catch (err) {
    // Refund credit if database insert fails
    try {
      await refundWorkspaceCredits(client, {
        workspaceId: botData.workspace_id,
        deductedFromSubscription: deductRes.deductedFromSubscription ?? 0,
        deductedFromPayg: deductRes.deductedFromPayg ?? 0,
        transactionType: ETransactionType.AddKnowledgeRefund,
        transactionDescription: `Refund credit: Failed to pin group message (${messageId.slice(0, 8)})`,
      });
    } catch (refundErr) {
      console.error("Error refunding credit after pin failure:", refundErr);
    }
    throw err;
  }
}

export async function unpinKnowledge(
  client: ServiceClient,
  knowledgeId: string,
  botId: string
): Promise<void> {
  // 1. Delete documents row matching chat_knowledge_id
  await client
    .from("documents")
    .delete()
    .eq("bot_id", botId)
    .contains("metadata", { chat_knowledge_id: knowledgeId });

  // 2. Delete chat_knowledge row
  const { error } = await client
    .from("chat_knowledge")
    .delete()
    .eq("id", knowledgeId)
    .eq("bot_id", botId);

  if (error) {
    console.error("Error deleting chat_knowledge:", error);
    throw error;
  }
}
