import type { ServiceClient } from "@/lib/services/types";
import { getGroupChatUrl } from "@/lib/utils/standalone-chat-url";
import {
  GROUP_MEMBER_CAP_REACHED_CODE,
  GROUP_ALREADY_MEMBER_CODE,
  GROUP_ALREADY_PINNED_CODE,
  GROUP_INSUFFICIENT_CREDITS_CODE,
} from "@/lib/constants";
import { EGroupChatStatus, EGroupSenderType, ETransactionType } from "@/types";
import { deductWorkspaceCredits, refundWorkspaceCredits } from "@/lib/services/credit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  GroupNoteRow,
  CreateGroupNoteInput,
  CreateNoteFromMessageInput,
  UpdateGroupNoteInput,
  GroupNotesPaginatedResponse,
} from "@/types/group-chat";

export type {
  GroupNoteRow,
  CreateGroupNoteInput,
  CreateNoteFromMessageInput,
  UpdateGroupNoteInput,
  GroupNotesPaginatedResponse,
};

export interface GroupChatRow {
  id: string;
  bot_id: string;
  status: "active" | "disabled" | EGroupChatStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string;
  email: string;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  role_label: string | null;
  can_pin_knowledge: boolean;
  can_create_note?: boolean;
  invited_by: string;
  last_read_at: string | null;
  joined_at: string;
}

export async function getGroupByBotId(
  client: ServiceClient,
  botId: string
): Promise<GroupChatRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from("group_chats")
    .select("*")
    .eq("bot_id", botId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching group chat by bot_id:", error);
    throw error;
  }

  return (data as GroupChatRow) || null;
}

export async function getOrCreateGroup(
  client: ServiceClient,
  botId: string,
  createdBy: string
): Promise<GroupChatRow> {
  const existing = await getGroupByBotId(client, botId);
  if (existing) {
    return existing;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from("group_chats")
    .insert({
      bot_id: botId,
      created_by: createdBy,
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
    // If unique constraint race condition, fetch existing
    if (error.code === "23505") {
      const raced = await getGroupByBotId(client, botId);
      if (raced) return raced;
    }
    console.error("Error creating group chat:", error);
    throw error;
  }

  return data as GroupChatRow;
}

export async function getGroupWithMembers(
  client: ServiceClient,
  botId: string,
  currentUser?: { id: string; email: string }
): Promise<{ group: GroupChatRow | null; members: GroupMemberRow[] }> {
  const group = await getGroupByBotId(client, botId);
  if (!group) {
    return { group: null, members: [] };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawFetchedMembers, error } = await (client as any)
    .from("group_members")
    .select("*")
    .eq("group_id", group.id)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Error fetching group members:", error);
    throw error;
  }

  let members = (rawFetchedMembers as GroupMemberRow[]) || [];

  // Reconcile user_id if currentUser email matches an unlinked group_members row
  if (currentUser?.email && currentUser?.id) {
    const unlinkedMember = (members as GroupMemberRow[])?.find(
      (m) =>
        m.email?.toLowerCase() === currentUser.email.toLowerCase() && m.user_id !== currentUser.id
    );

    if (unlinkedMember) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminClient = createAdminClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminClient as any)
          .from("group_members")
          .update({ user_id: currentUser.id })
          .eq("id", unlinkedMember.id);

        // Update local memory list
        members = members.map((m: GroupMemberRow) =>
          m.id === unlinkedMember.id ? { ...m, user_id: currentUser.id } : m
        );
      } catch (reconcileErr) {
        console.error("Error reconciling group member user_id:", reconcileErr);
      }
    }
  }

  const rawMembers = (members as GroupMemberRow[]) || [];

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const adminClient = createAdminClient();

    const enrichedMembers = await Promise.all(
      rawMembers.map(async (m) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: userData } = await (adminClient as any).auth.admin.getUserById(m.user_id);
          if (userData?.user) {
            const u = userData.user;
            const displayName =
              (u.user_metadata?.display_name as string) ||
              (u.user_metadata?.full_name as string) ||
              (u.user_metadata?.name as string) ||
              null;
            return {
              ...m,
              display_name: displayName,
              full_name: (u.user_metadata?.full_name as string) || null,
              avatar_url: (u.user_metadata?.avatar_url as string) || null,
            };
          }
        } catch {
          // Ignore individual user fetch errors
        }
        return m;
      })
    );

    return {
      group,
      members: enrichedMembers,
    };
  } catch {
    return {
      group,
      members: rawMembers,
    };
  }
}

export async function updateGroupStatus(
  client: ServiceClient,
  groupId: string,
  status: "active" | "disabled"
): Promise<GroupChatRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from("group_chats")
    .update({ status })
    .eq("id", groupId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating group status:", error);
    throw error;
  }

  return data as GroupChatRow;
}

export async function findAuthUserByEmail(
  adminClient: ServiceClient,
  email: string
): Promise<{ id: string; email: string } | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 1000;
  let page = 1;
  let hasMoreUsers = true;

  while (hasMoreUsers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminClient as any).auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

    if (found) {
      return { id: found.id, email: found.email };
    }

    if (users.length < perPage) {
      hasMoreUsers = false;
    } else {
      page += 1;
    }
  }

  return null;
}

export async function inviteGroupMember(
  adminClient: ServiceClient,
  params: {
    groupId: string;
    email: string;
    invitedBy: string;
    botName: string;
    inviterName: string;
  }
): Promise<{ member: GroupMemberRow; isNewAccount: boolean }> {
  const { groupId, email, invitedBy, botName, inviterName } = params;
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Check member limit (max 5)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error: countErr } = await (adminClient as any)
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (countErr) throw countErr;
  if ((count ?? 0) >= 5) {
    const limitError = new Error("GROUP_MEMBER_LIMIT_REACHED");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (limitError as any).code = GROUP_MEMBER_CAP_REACHED_CODE;
    throw limitError;
  }

  // 2. Compute group destination URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vielora.vn";
  let groupUrl: string | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: groupData } = await (adminClient as any)
    .from("group_chats")
    .select("bot_id")
    .eq("id", groupId)
    .single();

  if (groupData?.bot_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: botData } = await (adminClient as any)
      .from("bots")
      .select("slug")
      .eq("id", groupData.bot_id)
      .single();

    if (botData?.slug) {
      groupUrl = getGroupChatUrl(botData.slug);
    }
  }

  // 3. Check if auth user exists
  let targetUser = await findAuthUserByEmail(adminClient, normalizedEmail);
  let isNewAccount = false;
  let actionUrl: string | undefined;

  if (!targetUser) {
    // Create new unconfirmed auth user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newUser, error: createErr } = await (adminClient as any).auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: false,
    });
    if (createErr) throw createErr;
    targetUser = { id: newUser.user.id, email: newUser.user.email };
    isNewAccount = true;

    // Generate magic link with redirect to groupUrl
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: linkData, error: linkErr } = await (adminClient as any).auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo: groupUrl || appUrl,
      },
    });
    if (!linkErr && linkData?.properties?.action_link) {
      actionUrl = linkData.properties.action_link;
    }
  }

  // 4. Insert into group_members
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member, error: insertErr } = await (adminClient as any)
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: targetUser.id,
      email: normalizedEmail,
      invited_by: invitedBy,
      can_pin_knowledge: false,
      role_label: null,
    })
    .select("*")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      const existingMemberErr = new Error("User is already a member of this group");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (existingMemberErr as any).code = GROUP_ALREADY_MEMBER_CODE;
      throw existingMemberErr;
    }
    throw insertErr;
  }

  // 5. Send email notification (non-blocking)
  const { sendGroupInviteEmail } = await import("@/lib/services/email.service");
  sendGroupInviteEmail(normalizedEmail, {
    botName,
    invitedByName: inviterName,
    actionUrl,
    groupUrl,
    isNewAccount,
  }).catch((err) => console.error("Failed to send group invite email:", err));

  return { member: member as GroupMemberRow, isNewAccount };
}

export async function removeGroupMember(
  client: ServiceClient,
  groupId: string,
  memberId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from("group_members")
    .delete()
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (error) throw error;
}

export async function updateGroupMember(
  client: ServiceClient,
  groupId: string,
  memberId: string,
  updates: {
    role_label?: string | null;
    can_pin_knowledge?: boolean;
    can_create_note?: boolean;
  }
): Promise<GroupMemberRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from("group_members")
    .update(updates)
    .eq("id", memberId)
    .eq("group_id", groupId)
    .select("*")
    .single();

  if (error) throw error;
  return data as GroupMemberRow;
}

export async function leaveGroup(
  client: ServiceClient,
  groupId: string,
  userId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) throw error;
}

export interface GroupMessageRow {
  id: string;
  group_id: string;
  sender_type: "user" | "bot";
  sender_id: string | null;
  content: string;
  reply_to_id: string | null;
  mentions: string[];
  should_bot_reply: boolean;
  no_answer: boolean | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
}

export async function listGroupMessages(
  client: ServiceClient,
  groupId: string,
  options?: { before?: string; limit?: number }
): Promise<{ messages: GroupMessageRow[]; has_more: boolean }> {
  const limit = options?.limit ?? 50;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client as any)
    .from("group_messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (options?.before) {
    query = query.lt("created_at", options.before);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error listing group messages:", error);
    throw error;
  }

  const rows = (data as GroupMessageRow[]) || [];
  const has_more = rows.length > limit;
  const messages = has_more ? rows.slice(0, limit) : rows;

  return {
    messages,
    has_more,
  };
}

export async function insertGroupMessage(
  client: ServiceClient,
  params: {
    groupId: string;
    senderType: "user" | "bot";
    senderId: string | null;
    content: string;
    replyToId?: string | null;
    mentions?: string[];
    shouldBotReply?: boolean;
  }
): Promise<GroupMessageRow> {
  const { groupId, senderType, senderId, content, replyToId, mentions, shouldBotReply } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from("group_messages")
    .insert({
      group_id: groupId,
      sender_type: senderType,
      sender_id: senderId,
      content,
      reply_to_id: replyToId || null,
      mentions: mentions || [],
      should_bot_reply: shouldBotReply ?? true,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error inserting group message:", error);
    throw error;
  }

  return data as GroupMessageRow;
}

export async function softDeleteGroupMessage(
  client: ServiceClient,
  messageId: string,
  deletedBy: string
): Promise<GroupMessageRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from("group_messages")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
    })
    .eq("id", messageId)
    .select("*")
    .single();

  if (error) {
    console.error("Error soft deleting group message:", error);
    throw error;
  }

  return data as GroupMessageRow;
}

export async function markGroupRead(
  client: ServiceClient,
  groupId: string,
  userId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from("group_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error marking group read:", error);
    throw error;
  }
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (client as any)
    .from("chat_knowledge")
    .select("id")
    .eq("message_id", messageId)
    .maybeSingle();

  if (existing) {
    const err = new Error("Message is already pinned to knowledge base");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = GROUP_ALREADY_PINNED_CODE;
    throw err;
  }

  // Fetch message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message, error: msgErr } = await (client as any)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: parentMsg } = await (client as any)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: botReply } = await (client as any)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (client as any)
      .from("group_members")
      .select("role_label, display_name, full_name, email")
      .eq("group_id", message.group_id)
      .eq("user_id", questionerUserId)
      .maybeSingle();

    if (member) {
      questionerName =
        member.display_name || member.full_name || member.email?.split("@")[0] || "Thành viên nhóm";
      questionerRole = member.role_label || "Thành viên";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: botData } = await (client as any)
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
    const err = new Error(deductRes.message || "Insufficient workspace credits to pin message.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = GROUP_INSUFFICIENT_CREDITS_CODE;
    throw err;
  }

  try {
    // 1. Insert chat_knowledge
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: knowledge, error: kErr } = await (client as any)
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).from("documents").insert({
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any)
    .from("documents")
    .delete()
    .eq("bot_id", botId)
    .contains("metadata", { chat_knowledge_id: knowledgeId });

  // 2. Delete chat_knowledge row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from("chat_knowledge")
    .delete()
    .eq("id", knowledgeId)
    .eq("bot_id", botId);

  if (error) {
    console.error("Error deleting chat_knowledge:", error);
    throw error;
  }
}

/**
 * 1. Helper: Resolve workspaceId from botId
 */
async function resolveBotWorkspaceId(client: ServiceClient, botId: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bot, error } = await (client as any)
    .from("bots")
    .select("workspace_id")
    .eq("id", botId)
    .single();

  if (error || !bot?.workspace_id) {
    throw new Error("Bot workspace not found");
  }
  return bot.workspace_id;
}

/**
 * 2. Helper: Insert automated system notification in group_messages
 *
 * ⚠️ BLOCKING FIX (B1, spec-review 2026-08-16): The RLS policy
 * `group_messages_member_insert` (supabase/db-schema.sql:1600) hard-codes
 * `WITH CHECK (sender_type = 'user')`. Inserting `sender_type='system'` via the
 * user-session client is REJECTED by RLS → notification silently fails.
 * Therefore this helper MUST use the SERVICE-ROLE admin client (bypasses RLS),
 * exactly like `pinKnowledge` does at lib/services/group-chat.service.ts:123
 * (`const adminClient = createAdminClient();`). DO NOT pass the request's
 * user-session `client` here, and DO NOT relax the RLS policy.
 */
async function insertGroupSystemMessage(
  adminClient: ServiceClient,
  params: {
    groupId: string;
    content: string;
  }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from("group_messages").insert({
    group_id: params.groupId,
    sender_type: EGroupSenderType.System,
    sender_id: null,
    content: params.content,
    reply_to_id: null,
    mentions: [],
    should_bot_reply: false,
  });

  if (error) {
    console.error("Warning: Failed to insert system message for note mutation:", error);
  }
}

/**
 * 3. Fetch Single Active Note for Group Banner
 */
export async function getActiveGroupNote(
  client: ServiceClient,
  groupId: string
): Promise<GroupNoteRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from("group_notes")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching active group note:", error);
    throw error;
  }
  return data as GroupNoteRow | null;
}

/**
 * 4. List Notes with Cursor Pagination for Group Drawer
 */
export async function listGroupNotes(
  client: ServiceClient,
  groupId: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<GroupNotesPaginatedResponse> {
  const limit = Math.min(Math.max(options.limit || 20, 1), 50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client as any)
    .from("group_notes")
    .select("*")
    .eq("group_id", groupId)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error listing group notes:", error);
    throw error;
  }

  const rows = (data as GroupNoteRow[]) || [];
  const hasMore = rows.length > limit;
  const notes = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && notes.length > 0 ? notes[notes.length - 1].created_at : null;

  return {
    notes,
    nextCursor,
    hasMore,
  };
}

/**
 * 5. Create Group Note (Deduct 1 credit, Embed, Insert Document, Trigger Archive Old Active, System Notify)
 */
export async function createGroupNote(
  client: ServiceClient,
  input: CreateGroupNoteInput
): Promise<GroupNoteRow> {
  const {
    groupId,
    botId,
    userId,
    title,
    contentHtml,
    contentText,
    userName = "Thành viên",
  } = input;

  const workspaceId = await resolveBotWorkspaceId(client, botId);

  // A. Deduct 1 credit (AddKnowledge)
  const deductRes = await deductWorkspaceCredits(client, {
    workspaceId,
    creditAmount: 1,
    transactionType: ETransactionType.AddKnowledge,
    transactionDescription: `Create group note: ${title.slice(0, 30)}`,
  });

  if (!deductRes.success) {
    const err = new Error(deductRes.message || "Insufficient workspace credits to create note.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = GROUP_INSUFFICIENT_CREDITS_CODE;
    throw err;
  }

  let createdNote: GroupNoteRow | null = null;
  let documentId: string | null = null;

  const adminClient = createAdminClient(); // B1: service-role for system message
  try {
    // B. Insert note row (is_active = true triggers archive of previous active note)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: noteData, error: noteError } = await (client as any)
      .from("group_notes")
      .insert({
        group_id: groupId,
        bot_id: botId,
        created_by: userId,
        title,
        content_html: contentHtml,
        content_text: contentText,
        is_active: true,
      })
      .select("*")
      .single();

    if (noteError || !noteData) {
      throw noteError || new Error("Failed to insert group note");
    }
    createdNote = noteData as GroupNoteRow;

    // C. Generate RAG embedding and insert document with author & creation date
    const formattedDate = new Date(createdNote.created_at || Date.now()).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const contentToEmbed = `[Ghi chú nhóm]\n- Tiêu đề: ${title}\n- Người tạo: ${userName}\n- Thời gian tạo: ${formattedDate}\n- Nội dung:\n${contentText}`;
    const { generateEmbedding } = await import("@/lib/rag/generative");
    const embedding = await generateEmbedding({ text: contentToEmbed });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: docData, error: docError } = await (client as any)
      .from("documents")
      .insert({
        bot_id: botId,
        workspace_id: workspaceId,
        content: contentToEmbed,
        embedding: `[${embedding.join(",")}]`,
        metadata: {
          source: "group_note",
          source_type: "manual_text",
          group_note_id: createdNote.id,
          group_id: groupId,
          title,
          created_by: userId,
          author_name: userName,
          created_at: createdNote.created_at,
          is_active: true,
        },
      })
      .select("id")
      .single();

    if (docError || !docData) {
      throw docError || new Error("Failed to index note document for RAG");
    }
    documentId = docData.id;

    // Link document_id back to group_notes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any)
      .from("group_notes")
      .update({ document_id: documentId })
      .eq("id", createdNote.id);

    createdNote.document_id = documentId;

    // D. Insert in-chat system notification (B1: adminClient bypasses RLS)
    const safeTitle = title.length > 35 ? `${title.slice(0, 35)}...` : title;
    await insertGroupSystemMessage(adminClient, {
      groupId,
      content: `${userName} đã tạo ghi chú: "${safeTitle}"`,
    });

    return createdNote;
  } catch (err) {
    // Rollback: Refund credit and delete draft note if created
    if (createdNote?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).from("group_notes").delete().eq("id", createdNote.id);
    }
    try {
      await refundWorkspaceCredits(client, {
        workspaceId,
        deductedFromSubscription: deductRes.deductedFromSubscription ?? 0,
        deductedFromPayg: deductRes.deductedFromPayg ?? 0,
        transactionType: ETransactionType.AddKnowledgeRefund,
        transactionDescription: `Refund credit: Failed to create group note (${title.slice(0, 20)})`,
      });
    } catch (refundErr) {
      console.error("Critical error refunding credits after note creation failure:", refundErr);
    }
    throw err;
  }
}

/**
 * 6. Update Group Note (Deduct 1 credit, Update Note & Document RAG, System Notify)
 */
export async function updateGroupNote(
  client: ServiceClient,
  input: UpdateGroupNoteInput
): Promise<GroupNoteRow> {
  const {
    noteId,
    groupId,
    botId,
    title,
    contentHtml,
    contentText,
    userName = "Thành viên",
  } = input;

  const workspaceId = await resolveBotWorkspaceId(client, botId);
  const adminClient = createAdminClient(); // B1: service-role for system message

  // Fetch existing note
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingNote, error: fetchError } = await (client as any)
    .from("group_notes")
    .select("*")
    .eq("id", noteId)
    .eq("group_id", groupId)
    .single();

  if (fetchError || !existingNote) {
    throw new Error("Note not found");
  }

  // Deduct 1 credit (UpdateKnowledge)
  const deductRes = await deductWorkspaceCredits(client, {
    workspaceId,
    creditAmount: 1,
    transactionType: ETransactionType.UpdateKnowledge,
    transactionDescription: `Update group note: ${(title || existingNote.title).slice(0, 30)}`,
  });

  if (!deductRes.success) {
    const err = new Error(deductRes.message || "Insufficient workspace credits to update note.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = GROUP_INSUFFICIENT_CREDITS_CODE;
    throw err;
  }

  try {
    const updatedTitle = title !== undefined ? title : existingNote.title;
    const updatedHtml = contentHtml !== undefined ? contentHtml : existingNote.content_html;
    const updatedText = contentText !== undefined ? contentText : existingNote.content_text;

    // Update note row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedNote, error: updateError } = await (client as any)
      .from("group_notes")
      .update({
        title: updatedTitle,
        content_html: updatedHtml,
        content_text: updatedText,
      })
      .eq("id", noteId)
      .select("*")
      .single();

    if (updateError || !updatedNote) {
      throw updateError || new Error("Failed to update note");
    }

    // Update document RAG content and embedding with author & update date
    const formattedDate = new Date(updatedNote.updated_at || Date.now()).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const contentToEmbed = `[Ghi chú nhóm]\n- Tiêu đề: ${updatedTitle}\n- Người cập nhật: ${userName}\n- Thời gian cập nhật: ${formattedDate}\n- Nội dung:\n${updatedText}`;
    const { generateEmbedding } = await import("@/lib/rag/generative");
    const embedding = await generateEmbedding({ text: contentToEmbed });

    if (existingNote.document_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any)
        .from("documents")
        .update({
          content: contentToEmbed,
          embedding: `[${embedding.join(",")}]`,
          metadata: {
            source: "group_note",
            source_type: "manual_text",
            group_note_id: noteId,
            group_id: groupId,
            title: updatedTitle,
            updated_at: updatedNote.updated_at,
            author_name: userName,
            is_active: existingNote.is_active,
          },
        })
        .eq("id", existingNote.document_id);
    }

    // System notification (B1: adminClient)
    const safeTitle = updatedTitle.length > 35 ? `${updatedTitle.slice(0, 35)}...` : updatedTitle;
    await insertGroupSystemMessage(adminClient, {
      groupId,
      content: `${userName} đã cập nhật ghi chú: "${safeTitle}"`,
    });

    return updatedNote as GroupNoteRow;
  } catch (err) {
    // Refund credit on failure
    try {
      await refundWorkspaceCredits(client, {
        workspaceId,
        deductedFromSubscription: deductRes.deductedFromSubscription ?? 0,
        deductedFromPayg: deductRes.deductedFromPayg ?? 0,
        transactionType: ETransactionType.UpdateKnowledgeRefund,
        transactionDescription: `Refund credit: Failed to update group note (${noteId})`,
      });
    } catch (refundErr) {
      console.error("Critical error refunding credits after note update failure:", refundErr);
    }
    throw err;
  }
}

/**
 * 7. Hard Delete Group Note (Delete Document, Delete Note Row, System Notify - No Credit Refund)
 */
export async function deleteGroupNote(
  client: ServiceClient,
  params: {
    noteId: string;
    groupId: string;
    botId: string;
    userName?: string;
  }
): Promise<void> {
  const { noteId, groupId, userName = "Thành viên" } = params;
  const adminClient = createAdminClient(); // B1: service-role for system message

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: note, error: fetchError } = await (client as any)
    .from("group_notes")
    .select("id, title, document_id")
    .eq("id", noteId)
    .eq("group_id", groupId)
    .single();

  if (fetchError || !note) {
    throw new Error("Note not found");
  }

  // A. Hard delete document from RAG knowledge base
  if (note.document_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).from("documents").delete().eq("id", note.document_id);
  }

  // B. Hard delete group_notes row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (client as any)
    .from("group_notes")
    .delete()
    .eq("id", noteId);

  if (deleteError) {
    console.error("Error deleting group note:", deleteError);
    throw deleteError;
  }

  // C. System notification in chat (B1: adminClient)
  const safeTitle = note.title.length > 35 ? `${note.title.slice(0, 35)}...` : note.title;
  await insertGroupSystemMessage(adminClient, {
    groupId,
    content: `${userName} đã xóa ghi chú: "${safeTitle}"`,
  });
}

/**
 * 8. Toggle Note Collapsed State
 */
export async function toggleGroupNoteCollapse(
  client: ServiceClient,
  noteId: string,
  collapsed: boolean
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from("group_notes")
    .update({ collapsed })
    .eq("id", noteId);

  if (error) {
    console.error("Error toggling note collapse:", error);
    throw error;
  }
}

/**
 * 9. Unpin Group Note (Set is_active = false, archived_at = now, System Notify)
 */
export async function unpinGroupNote(
  client: ServiceClient,
  params: {
    noteId: string;
    groupId: string;
    userName?: string;
  }
): Promise<void> {
  const { noteId, groupId, userName = "Thành viên" } = params;
  const adminClient = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: note, error: fetchError } = await (client as any)
    .from("group_notes")
    .select("id, title")
    .eq("id", noteId)
    .eq("group_id", groupId)
    .single();

  if (fetchError || !note) {
    throw new Error("Note not found");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (client as any)
    .from("group_notes")
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("group_id", groupId);

  if (updateError) {
    console.error("Error unpinning group note:", updateError);
    throw updateError;
  }

  // System notification in chat
  const safeTitle = note.title.length > 35 ? `${note.title.slice(0, 35)}...` : note.title;
  await insertGroupSystemMessage(adminClient, {
    groupId,
    content: `${userName} đã bỏ ghim ghi chú: "${safeTitle}"`,
  });
}

/**
 * 10. Pin Group Note (Set is_active = true, archived_at = null, collapsed = false, System Notify)
 */
export async function pinGroupNote(
  client: ServiceClient,
  params: {
    noteId: string;
    groupId: string;
    userName?: string;
  }
): Promise<GroupNoteRow> {
  const { noteId, groupId, userName = "Thành viên" } = params;
  const adminClient = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: note, error: fetchError } = await (client as any)
    .from("group_notes")
    .select("*")
    .eq("id", noteId)
    .eq("group_id", groupId)
    .single();

  if (fetchError || !note) {
    throw new Error("Note not found");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (client as any)
    .from("group_notes")
    .update({
      is_active: true,
      archived_at: null,
      collapsed: false,
    })
    .eq("id", noteId)
    .eq("group_id", groupId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error("Error pinning group note:", updateError);
    throw updateError;
  }

  // System notification in chat
  const safeTitle = note.title.length > 35 ? `${note.title.slice(0, 35)}...` : note.title;
  await insertGroupSystemMessage(adminClient, {
    groupId,
    content: `${userName} đã ghim ghi chú: "${safeTitle}"`,
  });

  return updated as GroupNoteRow;
}

/**
 * 12. Create Group Note from Pinned Message (IDOR Check, Smart Q&A Extraction, RAG Embedding, System Notify)
 */
export async function createNoteFromMessage(
  client: ServiceClient,
  input: CreateNoteFromMessageInput
): Promise<GroupNoteRow> {
  const { groupId, botId, messageId, userId, userName, isActive = false } = input;

  // 1. Anti-IDOR Check: Message must belong to this groupId and not be deleted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message, error: msgErr } = await (client as any)
    .from("group_messages")
    .select("*")
    .eq("id", messageId)
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .single();

  if (msgErr || !message) {
    throw new Error("Tin nhắn không tồn tại hoặc đã bị xóa.");
  }

  // 2. Check if message is already pinned as a note in this group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingNote } = await (client as any)
    .from("group_notes")
    .select("id")
    .eq("group_id", groupId)
    .eq("source_message_id", messageId)
    .maybeSingle();

  if (existingNote) {
    const err = new Error("Tin nhắn này đã được lưu vào ghi chú nhóm trước đó.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = GROUP_ALREADY_PINNED_CODE;
    throw err;
  }

  // 3. Smart extraction
  let title = "";
  let contentText = "";
  let contentHtml = "";

  if (message.sender_type === EGroupSenderType.Bot) {
    let question = "";
    if (message.reply_to_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: parentMsg } = await (client as any)
        .from("group_messages")
        .select("content")
        .eq("id", message.reply_to_id)
        .eq("group_id", groupId)
        .maybeSingle();
      question = parentMsg?.content?.trim() || "";
    }

    const { parseMarkdown } = await import("@/lib/helpers/chat-helpers");

    if (question) {
      const shortQuestion = question.length > 40 ? `${question.slice(0, 40)}...` : question;
      title = `Hỏi đáp: ${shortQuestion}`;
      contentText = `**Câu hỏi:**\n${question}\n\n**Trả lời:**\n${message.content}`;
      contentHtml = `<p><strong>Câu hỏi:</strong></p><div>${parseMarkdown(question)}</div><p class="mt-3"><strong>Trả lời:</strong></p><div>${parseMarkdown(message.content)}</div>`;
    } else {
      const snippet = message.content.slice(0, 35).replace(/\n/g, " ").trim();
      title = `Câu trả lời AI: ${snippet}${message.content.length > 35 ? "..." : ""}`;
      contentText = message.content;
      contentHtml = parseMarkdown(message.content);
    }
  } else {
    let senderDisplayName = "Thành viên";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (client as any)
      .from("group_members")
      .select("display_name, full_name, role_label")
      .eq("group_id", groupId)
      .eq("user_id", message.sender_id)
      .maybeSingle();

    if (member) {
      senderDisplayName = member.display_name || member.full_name || "Thành viên";
    }
    const snippet = message.content.slice(0, 35).replace(/\n/g, " ").trim();
    title = `Ghi chú từ ${senderDisplayName}: ${snippet}${message.content.length > 35 ? "..." : ""}`;
    contentText = message.content;
    const { parseMarkdown } = await import("@/lib/helpers/chat-helpers");
    contentHtml = parseMarkdown(message.content);
  }

  // 4. Fetch bot workspace & deduct 1 credit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: botData } = await (client as any)
    .from("bots")
    .select("workspace_id")
    .eq("id", botId)
    .single();

  const workspaceId = botData?.workspace_id;
  if (!workspaceId) {
    throw new Error("Bot workspace not found");
  }

  const deductRes = await deductWorkspaceCredits(client, {
    workspaceId,
    creditAmount: 1,
    transactionType: ETransactionType.AddKnowledge,
    transactionDescription: `Save group message to note: ${title.slice(0, 30)}`,
  });

  if (!deductRes.success) {
    const err = new Error(deductRes.message || "Insufficient workspace credits to save note.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = GROUP_INSUFFICIENT_CREDITS_CODE;
    throw err;
  }

  let createdNote: GroupNoteRow | null = null;
  let documentId: string | null = null;
  const adminClient = createAdminClient();

  try {
    // 5. Insert note row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: noteData, error: noteError } = await (client as any)
      .from("group_notes")
      .insert({
        group_id: groupId,
        bot_id: botId,
        created_by: userId,
        title,
        content_html: contentHtml,
        content_text: contentText,
        is_active: isActive,
        source_message_id: messageId,
      })
      .select("*")
      .single();

    if (noteError || !noteData) {
      throw noteError || new Error("Failed to insert group note from message");
    }
    createdNote = noteData as GroupNoteRow;

    // 6. Generate RAG embedding and insert document
    const formattedDate = new Date(createdNote.created_at || Date.now()).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const contentToEmbed = `[Ghi chú nhóm - Trích xuất tin nhắn]\n- Tiêu đề: ${title}\n- Người lưu: ${userName}\n- Thời gian: ${formattedDate}\n- Nội dung:\n${contentText}`;
    const { generateEmbedding } = await import("@/lib/rag/generative");
    const embedding = await generateEmbedding({ text: contentToEmbed });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: docData, error: docError } = await (client as any)
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
          title,
          created_by: userId,
          author_name: userName,
          created_at: createdNote.created_at,
          is_active: isActive,
        },
      })
      .select("id")
      .single();

    if (docError || !docData) {
      throw docError || new Error("Failed to index note document for RAG");
    }
    documentId = docData.id;

    // Link document_id back to group_notes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any)
      .from("group_notes")
      .update({ document_id: documentId })
      .eq("id", createdNote.id);

    createdNote.document_id = documentId;

    // 7. System notification in chat
    const safeTitle = title.length > 35 ? `${title.slice(0, 35)}...` : title;
    await insertGroupSystemMessage(adminClient, {
      groupId,
      content: `${userName} đã lưu tin nhắn vào ghi chú: "${safeTitle}"`,
    });

    return createdNote;
  } catch (err) {
    if (createdNote?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).from("group_notes").delete().eq("id", createdNote.id);
    }
    try {
      await refundWorkspaceCredits(client, {
        workspaceId,
        deductedFromSubscription: deductRes.deductedFromSubscription ?? 0,
        deductedFromPayg: deductRes.deductedFromPayg ?? 0,
        transactionType: ETransactionType.AddKnowledgeRefund,
        transactionDescription: `Refund credit: Failed to save group message to note (${title.slice(0, 20)})`,
      });
    } catch (refundErr) {
      console.error("Critical error refunding credits after note failure:", refundErr);
    }
    throw err;
  }
}

/**
 * 13. List Group Notes for Bot (Dashboard Management)
 */
export async function listGroupNotesForBot(
  client: ServiceClient,
  botId: string
): Promise<GroupNoteRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group } = await (client as any)
    .from("group_chats")
    .select("id")
    .eq("bot_id", botId)
    .maybeSingle();

  if (!group) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notes, error } = await (client as any)
    .from("group_notes")
    .select("*")
    .eq("group_id", group.id)
    .order("created_at", { ascending: false });

  if (error || !notes) return [];

  // Fetch creator member profiles to attach
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: members } = await (client as any)
    .from("group_members")
    .select("user_id, display_name, full_name, email")
    .eq("group_id", group.id);

  const memberMap = new Map<
    string,
    { display_name?: string | null; full_name?: string | null; email?: string | null }
  >();
  if (members) {
    for (const m of members) {
      memberMap.set(m.user_id, {
        display_name: m.display_name,
        full_name: m.full_name,
        email: m.email,
      });
    }
  }

  return (notes as GroupNoteRow[]).map((note) => ({
    ...note,
    creator: memberMap.get(note.created_by) || undefined,
  }));
}
