import type { ServiceClient } from "@/lib/services/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GroupChatRow, GroupMemberRow, GroupMessageRow } from "@/types/group-chat";

export async function getGroupByBotId(
  client: ServiceClient,
  botId: string
): Promise<GroupChatRow | null> {
  const { data, error } = await client
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

  const { data, error } = await client
    .from("group_chats")
    .insert({
      bot_id: botId,
      created_by: createdBy,
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
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

  const { data: rawFetchedMembers, error } = await client
    .from("group_members")
    .select("*")
    .eq("group_id", group.id)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Error fetching group members:", error);
    throw error;
  }

  let members = (rawFetchedMembers as GroupMemberRow[]) || [];

  if (currentUser?.email && currentUser?.id) {
    const unlinkedMember = members.find(
      (m) =>
        m.email?.toLowerCase() === currentUser.email.toLowerCase() && m.user_id !== currentUser.id
    );

    if (unlinkedMember) {
      try {
        const adminClient = createAdminClient();
        await adminClient
          .from("group_members")
          .update({ user_id: currentUser.id })
          .eq("id", unlinkedMember.id);

        members = members.map((m: GroupMemberRow) =>
          m.id === unlinkedMember.id ? { ...m, user_id: currentUser.id } : m
        );
      } catch (reconcileErr) {
        console.error("Error reconciling group member user_id:", reconcileErr);
      }
    }
  }

  try {
    const adminClient = createAdminClient();
    const enrichedMembers = await Promise.all(
      members.map(async (m) => {
        try {
          const { data: userData } = await adminClient.auth.admin.getUserById(m.user_id);
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
      members,
    };
  }
}

export async function updateGroupStatus(
  client: ServiceClient,
  groupId: string,
  status: "active" | "disabled"
): Promise<GroupChatRow> {
  const { data, error } = await client
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

export async function listGroupMessages(
  client: ServiceClient,
  groupId: string,
  options?: { before?: string; limit?: number }
): Promise<{ messages: GroupMessageRow[]; has_more: boolean }> {
  const limit = options?.limit ?? 50;
  let query = client
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

  const { data, error } = await client
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
  const { data, error } = await client
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
  const { error } = await client
    .from("group_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error marking group read:", error);
    throw error;
  }
}
