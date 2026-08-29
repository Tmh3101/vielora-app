import type { ServiceClient } from "@/lib/services/types";
import { isBotManager } from "@/lib/services/group-permission.service";
import { createAdminClient } from "@/lib/supabase/admin";

export interface GroupNoteWritePermissionResult {
  allowed: boolean;
  botId: string | null;
  groupTitle: string | null;
  userName: string;
}

export interface GroupNoteReadPermissionResult {
  allowed: boolean;
  botId: string | null;
  groupTitle: string | null;
}

/**
 * Check if the user is authorized to write (create, update, delete) group notes.
 * Authorization rules:
 * 1. User is a bot manager (workspace owner/admin or assigned manager) -> allowed
 * 2. User is a group member with can_create_note = true or can_pin_knowledge = true -> allowed
 */
export async function checkGroupNoteWritePermission(
  _client: ServiceClient,
  groupId: string,
  userId: string,
  providedBotId?: string,
  userMetadata?: {
    display_name?: string | null;
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
  } | null
): Promise<GroupNoteWritePermissionResult> {
  const adminClient = createAdminClient();
  const normalizedEmail = userMetadata?.email?.trim().toLowerCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group, error: groupErr } = await (adminClient as any)
    .from("group_chats")
    .select("id, bot_id")
    .eq("id", groupId)
    .single();

  if (groupErr || !group) {
    return { allowed: false, botId: null, groupTitle: null, userName: "" };
  }

  const botId = group.bot_id || providedBotId || null;
  const groupTitle = null;

  if (!botId) {
    return { allowed: false, botId: null, groupTitle, userName: "" };
  }

  // Fetch member info by userId or email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let memberQuery = (adminClient as any)
    .from("group_members")
    .select("id, user_id, email, role_label, can_create_note, can_pin_knowledge")
    .eq("group_id", groupId);

  if (userId) {
    memberQuery = memberQuery.eq("user_id", userId);
  } else if (normalizedEmail) {
    memberQuery = memberQuery.eq("email", normalizedEmail);
  }

  const { data: member } = await memberQuery.maybeSingle();

  // Resolve author display name priority:
  // 1. user metadata display_name / full_name / name
  // 2. member email prefix / user email prefix
  // 3. fallback
  const resolvedName =
    userMetadata?.display_name?.trim() ||
    userMetadata?.full_name?.trim() ||
    userMetadata?.name?.trim() ||
    (member?.email ? member.email.split("@")[0] : null) ||
    (userMetadata?.email ? userMetadata.email.split("@")[0] : null) ||
    "";

  // 1. Check if user is bot manager (owner/admin)
  const isManager = await isBotManager(adminClient, botId, userId);
  if (isManager) {
    return {
      allowed: true,
      botId,
      groupTitle,
      userName: resolvedName || "Quản trị viên",
    };
  }

  // 2. Check if user is group member with can_create_note = true or can_pin_knowledge = true
  if (member && (member.can_create_note || member.can_pin_knowledge)) {
    return {
      allowed: true,
      botId,
      groupTitle,
      userName: resolvedName || "Thành viên",
    };
  }

  return { allowed: false, botId, groupTitle, userName: "" };
}

/**
 * Check if the user is authorized to read group notes (any group member or bot manager).
 */
export async function checkGroupNoteReadPermission(
  _client: ServiceClient,
  groupId: string,
  userId: string,
  userEmail?: string | null
): Promise<GroupNoteReadPermissionResult> {
  const adminClient = createAdminClient();
  const normalizedEmail = userEmail?.trim().toLowerCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group, error: groupErr } = await (adminClient as any)
    .from("group_chats")
    .select("id, bot_id")
    .eq("id", groupId)
    .single();

  if (groupErr || !group) {
    return { allowed: false, botId: null, groupTitle: null };
  }

  const botId = group.bot_id;

  // 1. Check if user is bot manager
  if (botId) {
    const isManager = await isBotManager(adminClient, botId, userId);
    if (isManager) {
      return { allowed: true, botId, groupTitle: null };
    }
  }

  // 2. Check if user is group member by userId or email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let memberQuery = (adminClient as any)
    .from("group_members")
    .select("id, user_id")
    .eq("group_id", groupId);

  if (normalizedEmail) {
    memberQuery = memberQuery.or(`user_id.eq.${userId},email.ilike.${normalizedEmail}`);
  } else {
    memberQuery = memberQuery.eq("user_id", userId);
  }

  const { data: member } = await memberQuery.maybeSingle();

  if (member) {
    if (member.user_id !== userId && userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from("group_members")
        .update({ user_id: userId })
        .eq("id", member.id);
    }
    return { allowed: true, botId, groupTitle: null };
  }

  return { allowed: false, botId, groupTitle: null };
}
