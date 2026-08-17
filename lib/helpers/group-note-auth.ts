import type { ServiceClient } from "@/lib/services/types";
import { isBotManager } from "@/lib/services/group-permission.service";

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
 * 2. User is a group member with can_create_note = true -> allowed
 */
export async function checkGroupNoteWritePermission(
  client: ServiceClient,
  groupId: string,
  userId: string,
  providedBotId?: string,
  userMetadata?: {
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
  } | null
): Promise<GroupNoteWritePermissionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group, error: groupErr } = await (client as any)
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

  // Fetch member info if exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member } = await (client as any)
    .from("group_members")
    .select("can_create_note, role_label, display_name, full_name, email")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  // Resolve author name priority:
  // 1. member display_name / full_name
  // 2. user metadata full_name / name
  // 3. member email prefix / user email prefix
  // 4. member role_label
  // 5. fallback
  const resolvedName =
    member?.display_name?.trim() ||
    member?.full_name?.trim() ||
    userMetadata?.full_name?.trim() ||
    userMetadata?.name?.trim() ||
    (member?.email ? member.email.split("@")[0] : null) ||
    (userMetadata?.email ? userMetadata.email.split("@")[0] : null) ||
    member?.role_label?.trim() ||
    "";

  // 1. Check if user is bot manager (owner/admin)
  const isManager = await isBotManager(client, botId, userId);
  if (isManager) {
    return {
      allowed: true,
      botId,
      groupTitle,
      userName: resolvedName || "Quản trị viên",
    };
  }

  // 2. Check if user is group member with can_create_note = true
  if (member && member.can_create_note) {
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
  client: ServiceClient,
  groupId: string,
  userId: string
): Promise<GroupNoteReadPermissionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group, error: groupErr } = await (client as any)
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
    const isManager = await isBotManager(client, botId, userId);
    if (isManager) {
      return { allowed: true, botId, groupTitle: null };
    }
  }

  // 2. Check if user is group member
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member } = await (client as any)
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (member) {
    return { allowed: true, botId, groupTitle: null };
  }

  return { allowed: false, botId, groupTitle: null };
}
