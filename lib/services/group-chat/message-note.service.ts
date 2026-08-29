import type { ServiceClient } from "@/lib/services/types";
import { GROUP_ALREADY_PINNED_CODE, GROUP_INSUFFICIENT_CREDITS_CODE } from "@/lib/constants";
import { GROUP_CHAT_CONFIG } from "@/config/group-chat";
import { GROUP_MESSAGES } from "@/lib/constants/group-chat-messages";
import { EGroupSenderType, ETransactionType } from "@/types/enums";
import { deductWorkspaceCredits, refundWorkspaceCredits } from "@/lib/services/credit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GroupServiceError,
  type GroupNoteRow,
  type GroupMessageRow,
  type CreateNoteFromMessageInput,
} from "@/types/group-chat";
import { insertGroupSystemMessage } from "./notes.service";

interface SenderMeta {
  senderName: string;
  senderRole: string;
  dateStr: string;
  isBot: boolean;
}

/**
 * Helper 1: Validate Message and Check Duplicate
 */
async function validateMessageForNote(
  adminClient: ServiceClient,
  groupId: string,
  messageId: string
): Promise<GroupMessageRow> {
  const { data: message, error: msgErr } = await adminClient
    .from("group_messages")
    .select("*")
    .eq("id", messageId)
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .single();

  if (msgErr || !message) {
    throw new Error(GROUP_MESSAGES.ERRORS.MESSAGE_NOT_FOUND);
  }

  // Check if already pinned
  const { data: existingNote } = await adminClient
    .from("group_notes")
    .select("id")
    .eq("group_id", groupId)
    .eq("source_message_id", messageId)
    .maybeSingle();

  if (existingNote) {
    throw new GroupServiceError(GROUP_MESSAGES.ERRORS.ALREADY_PINNED, GROUP_ALREADY_PINNED_CODE);
  }

  return message as GroupMessageRow;
}

/**
 * Helper 2: Resolve Sender Metadata
 */
async function resolveSenderMetadata(
  adminClient: ServiceClient,
  msg: GroupMessageRow,
  groupId: string,
  botName: string,
  userId: string,
  userName?: string
): Promise<SenderMeta> {
  const isBot = msg.sender_type === EGroupSenderType.Bot;
  let senderName = isBot ? botName : GROUP_MESSAGES.ROLES.DEFAULT_MEMBER;
  let senderRole = isBot ? GROUP_MESSAGES.ROLES.AI_ASSISTANT : GROUP_MESSAGES.ROLES.DEFAULT_MEMBER;

  if (!isBot && msg.sender_id) {
    const { data: member } = await adminClient
      .from("group_members")
      .select("role_label, email")
      .eq("group_id", groupId)
      .eq("user_id", msg.sender_id)
      .maybeSingle();

    if (member?.role_label) {
      senderRole = member.role_label;
    }

    let userDisplayName = "";
    try {
      const { data: userData } = await adminClient.auth.admin.getUserById(msg.sender_id);
      if (userData?.user) {
        const u = userData.user;
        userDisplayName =
          (u.user_metadata?.display_name as string) ||
          (u.user_metadata?.full_name as string) ||
          (u.user_metadata?.name as string) ||
          "";
      }
    } catch {
      // ignore
    }

    if (userDisplayName) {
      senderName = userDisplayName;
    } else if (
      msg.sender_id === userId &&
      userName &&
      userName !== GROUP_MESSAGES.ROLES.DEFAULT_MEMBER
    ) {
      senderName = userName;
    } else if (member?.email) {
      senderName = member.email.split("@")[0];
    }
  }

  const dateStr = new Date(msg.created_at || Date.now()).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return { senderName, senderRole, dateStr, isBot };
}

/**
 * Helper 3: Format Note Title and Content
 */
function formatNoteContent(
  message: GroupMessageRow,
  parentMessage: GroupMessageRow | null,
  currentSender: SenderMeta,
  parentSender: SenderMeta | null
): { title: string; contentText: string } {
  let title = "";
  let contentText = "";

  if (parentMessage && parentSender) {
    const parentSnippet = parentMessage.content.slice(0, 35).replace(/\n/g, " ").trim();
    const currentSnippet = message.content.slice(0, 35).replace(/\n/g, " ").trim();

    if (message.sender_type === EGroupSenderType.Bot) {
      title = `Hỏi đáp: ${parentSnippet}${parentMessage.content.length > 35 ? "..." : ""}`;
      contentText = `**Câu hỏi (${parentSender.senderName} - ${parentSender.senderRole}, ${parentSender.dateStr}):**
${parentMessage.content}

**Trả lời (${currentSender.senderName}, ${currentSender.dateStr}):**
${message.content}`;
    } else {
      title = `Phản hồi: ${currentSnippet}${message.content.length > 35 ? "..." : ""}`;
      contentText = `**${parentSender.senderName} (${parentSender.senderRole}, ${parentSender.dateStr}):**
${parentMessage.content}

**${currentSender.senderName} (${currentSender.senderRole}, ${currentSender.dateStr}):**
${message.content}`;
    }
  } else {
    const snippet = message.content.slice(0, 35).replace(/\n/g, " ").trim();
    if (message.sender_type === EGroupSenderType.Bot) {
      title = `Câu trả lời AI: ${snippet}${message.content.length > 35 ? "..." : ""}`;
      contentText = `**${currentSender.senderName} (${GROUP_MESSAGES.ROLES.AI_ASSISTANT}, ${currentSender.dateStr}):**
${message.content}`;
    } else {
      title = `${currentSender.senderName} (${currentSender.senderRole}): ${snippet}${message.content.length > 35 ? "..." : ""}`;
      contentText = `**${currentSender.senderName} (${currentSender.senderRole}, ${currentSender.dateStr}):**
${message.content}`;
    }
  }

  if (title.length > GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH) {
    title = `${title.slice(0, GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH - 3)}...`;
  }

  return { title, contentText };
}

/**
 * Main Orchestrator: Create Group Note from Pinned Message (Saga Pattern)
 */
export async function createNoteFromMessage(
  client: ServiceClient,
  input: CreateNoteFromMessageInput
): Promise<GroupNoteRow> {
  const { groupId, botId, messageId, userId, userName, isActive = false } = input;
  const adminClient = createAdminClient();

  // 1. Validate message
  const message = await validateMessageForNote(adminClient, groupId, messageId);

  // 2. Fetch bot and workspace
  const { data: botData } = await adminClient
    .from("bots")
    .select("name, workspace_id")
    .eq("id", botId)
    .single();

  const botName = botData?.name || GROUP_MESSAGES.ROLES.AI_ASSISTANT;
  const workspaceId = botData?.workspace_id;
  if (!workspaceId) {
    throw new Error(GROUP_MESSAGES.ERRORS.BOT_WORKSPACE_NOT_FOUND);
  }

  // 3. Resolve current and parent senders
  const currentSender = await resolveSenderMetadata(
    adminClient,
    message,
    groupId,
    botName,
    userId,
    userName
  );

  let parentMessage: GroupMessageRow | null = null;
  let parentSender: SenderMeta | null = null;

  if (message.reply_to_id) {
    const { data: pMsg } = await adminClient
      .from("group_messages")
      .select("*")
      .eq("id", message.reply_to_id)
      .eq("group_id", groupId)
      .maybeSingle();

    if (pMsg) {
      parentMessage = pMsg as GroupMessageRow;
      parentSender = await resolveSenderMetadata(
        adminClient,
        parentMessage,
        groupId,
        botName,
        userId,
        userName
      );
    }
  }

  // 4. Build Title, ContentText, ContentHTML
  const { parseMarkdown } = await import("@/lib/helpers/chat-helpers");
  const { title, contentText } = formatNoteContent(
    message,
    parentMessage,
    currentSender,
    parentSender
  );
  const contentHtml = parseMarkdown(contentText);

  // 5. Deduct 1 credit atomically via RPC
  const deductRes = await deductWorkspaceCredits(adminClient, {
    workspaceId,
    creditAmount: 1,
    transactionType: ETransactionType.AddKnowledge,
    transactionDescription: `Save group message to note: ${title.slice(0, 30)}`,
  });

  if (!deductRes.success) {
    throw new GroupServiceError(
      deductRes.message || GROUP_MESSAGES.ERRORS.INSUFFICIENT_CREDITS_CREATE,
      GROUP_INSUFFICIENT_CREDITS_CODE
    );
  }

  let createdNote: GroupNoteRow | null = null;
  let documentId: string | null = null;

  try {
    // 6. Insert note row
    const { data: noteData, error: noteError } = await adminClient
      .from("group_notes")
      .insert({
        group_id: groupId,
        bot_id: botId,
        created_by: userId,
        title,
        content_html: contentHtml,
        content_text: contentText,
        is_active: isActive,
        collapsed: true,
        source_message_id: messageId,
      })
      .select("*")
      .single();

    if (noteError || !noteData) {
      throw noteError || new Error("Failed to insert group note from message");
    }
    createdNote = noteData as GroupNoteRow;

    // 7. Generate RAG embedding & insert into documents
    const saveFormattedDate = new Date(createdNote.created_at || Date.now()).toLocaleString(
      "vi-VN",
      {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
    const contentToEmbed = `[Ghi chú nhóm - Trích xuất từ thảo luận nhóm]
- Tiêu đề: ${title}
- Người lưu ghi chú: ${userName || currentSender.senderName}
- Thời gian lưu: ${saveFormattedDate}

${contentText}`;

    const { generateEmbedding } = await import("@/lib/rag/generative");
    const embedding = await generateEmbedding({ text: contentToEmbed });

    const { data: docData, error: docError } = await adminClient
      .from("documents")
      .insert({
        bot_id: botId,
        workspace_id: workspaceId,
        content: contentToEmbed,
        embedding: `[${embedding.join(",")}]`,
        metadata: {
          source: "group_note",
          source_type: "pinned_message",
          group_note_id: createdNote.id,
          group_id: groupId,
          source_message_id: messageId,
          reply_to_id: message.reply_to_id || null,
          title,
          created_by: userId,
          author_name: userName || currentSender.senderName,
          created_at: createdNote.created_at,
          is_active: isActive,
        },
      })
      .select("id")
      .single();

    if (docError || !docData) {
      throw docError || new Error(GROUP_MESSAGES.ERRORS.RAG_INDEX_FAILED);
    }
    documentId = docData.id;

    // Link document_id
    await adminClient
      .from("group_notes")
      .update({ document_id: documentId })
      .eq("id", createdNote.id);

    createdNote.document_id = documentId;

    // 8. In-chat system notification
    const safeTitle = title.length > 35 ? `${title.slice(0, 35)}...` : title;
    await insertGroupSystemMessage(adminClient, {
      groupId,
      content: `${userName || currentSender.senderName} đã lưu tin nhắn vào ghi chú: "${safeTitle}"`,
    });

    return createdNote;
  } catch (err) {
    if (createdNote?.id) {
      await adminClient.from("group_notes").delete().eq("id", createdNote.id);
    }
    try {
      await refundWorkspaceCredits(adminClient, {
        workspaceId,
        deductedFromSubscription: deductRes.deductedFromSubscription ?? 0,
        deductedFromPayg: deductRes.deductedFromPayg ?? 0,
        transactionType: ETransactionType.AddKnowledgeRefund,
        transactionDescription: `Refund credit: Failed to save group message as note (${title.slice(0, 20)})`,
      });
    } catch (refundErr) {
      console.error("Critical error refunding credits after note message failure:", refundErr);
    }
    throw err;
  }
}
