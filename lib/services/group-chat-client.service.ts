import { GroupChatRow, GroupMemberRow, GroupMessageRow } from "@/lib/services/group-chat.service";
import { EGroupChatStatus } from "@/types";
import type { GroupNoteRow, GroupNotesPaginatedResponse } from "@/types/group-chat";

export interface GroupResponse {
  success: boolean;
  data?: {
    group: GroupChatRow | null;
    members: GroupMemberRow[];
  };
  code?: string;
  message?: string;
}

export interface SingleGroupResponse {
  success: boolean;
  data?: GroupChatRow;
  code?: string;
  message?: string;
}

export interface MembersResponse {
  success: boolean;
  data?: GroupMemberRow[];
  code?: string;
  message?: string;
}

export interface SingleMemberResponse {
  success: boolean;
  data?: GroupMemberRow;
  isNewAccount?: boolean;
  code?: string;
  message?: string;
}

export interface SendMessagePayload {
  content: string;
  reply_to_id?: string;
  mentions?: string[];
  should_bot_reply?: boolean;
}

export interface FetchMessagesParams {
  limit?: number;
  before?: string;
}

/**
 * 1. Fetch Group Details & Members
 */
export async function fetchGroupDetailsApi(botId: string): Promise<GroupResponse> {
  const res = await fetch(`/api/bots/${botId}/group`);
  return res.json();
}

/**
 * 2. Create Group Chat for Bot
 */
export async function createGroupApi(botId: string): Promise<SingleGroupResponse> {
  const res = await fetch(`/api/bots/${botId}/group`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

/**
 * 3. Update Group Status (Active / Disabled)
 */
export async function updateGroupStatusApi(
  botId: string,
  status: "active" | "disabled" | EGroupChatStatus
): Promise<SingleGroupResponse> {
  const res = await fetch(`/api/bots/${botId}/group`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

/**
 * 4. Fetch Group Members List
 */
export async function fetchMembersApi(botId: string): Promise<MembersResponse> {
  const res = await fetch(`/api/bots/${botId}/group/members`);
  return res.json();
}

/**
 * 5. Invite Member to Group
 */
export async function inviteMemberApi(botId: string, email: string): Promise<SingleMemberResponse> {
  const res = await fetch(`/api/bots/${botId}/group/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

/**
 * 6. Remove Member from Group
 */
export async function removeMemberApi(
  botId: string,
  memberId: string
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`/api/bots/${botId}/group/members/${memberId}`, {
    method: "DELETE",
  });
  return res.json();
}

/**
 * 7. Update Member Permissions / Role
 */
export async function updateMemberApi(
  botId: string,
  memberId: string,
  updates: {
    role_label?: string | null;
    can_pin_knowledge?: boolean;
    can_create_note?: boolean;
    can_export_report?: boolean;
    canExportReport?: boolean;
  }
): Promise<SingleMemberResponse> {
  const res = await fetch(`/api/bots/${botId}/group/members/${memberId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

/**
 * 8. Fetch Pinned Knowledge for Bot
 */
export async function fetchPinnedKnowledgeApi(botId: string) {
  const res = await fetch(`/api/bots/${botId}/group/knowledge`);
  return res.json();
}

/**
 * 9. Pin Message to Bot Knowledge Base
 */
export async function pinMessageApi(botId: string, messageId: string) {
  const res = await fetch(`/api/bots/${botId}/group/knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message_id: messageId }),
  });
  return res.json();
}

/**
 * 10. Unpin Knowledge from Bot
 */
export async function unpinKnowledgeApi(botId: string, knowledgeId: string): Promise<boolean> {
  const res = await fetch(`/api/bots/${botId}/group/knowledge/${knowledgeId}`, {
    method: "DELETE",
  });
  return res.status === 204;
}

/**
 * 11. Fetch Group Messages with Pagination
 */
export async function fetchGroupMessagesApi(
  botId: string,
  params?: FetchMessagesParams
): Promise<{
  success: boolean;
  data?: GroupMessageRow[];
  hasMore?: boolean;
  lastReadAt?: string | null;
  firstUnreadId?: string | null;
  unreadCount?: number;
  message?: string;
}> {
  const url = new URL(
    `/api/bots/${botId}/group/messages`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
  );
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());
  if (params?.before) url.searchParams.set("before", params.before);

  const res = await fetch(url.toString());
  return res.json();
}

/**
 * 12. Send Message to Group Chat
 */
export async function sendGroupMessageApi(
  botId: string,
  payload: SendMessagePayload
): Promise<Response> {
  return fetch(`/api/bots/${botId}/group/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * 13. Delete Message from Group Chat
 */
export async function deleteGroupMessageApi(botId: string, messageId: string): Promise<Response> {
  return fetch(`/api/bots/${botId}/group/messages/${messageId}`, {
    method: "PATCH",
  });
}

/**
 * 14. Mark Group Messages Read
 */
export async function markGroupMessagesReadApi(botId: string): Promise<Response> {
  return fetch(`/api/bots/${botId}/group/messages/read`, {
    method: "POST",
  });
}

/**
 * 15. Leave Group Chat (Current Member)
 */
export async function leaveGroupApi(botId: string): Promise<Response> {
  return fetch(`/api/bots/${botId}/group/me`, {
    method: "DELETE",
  });
}

/**
 * 16. Fetch Active Group Note
 */
export async function fetchActiveNoteApi(groupId: string): Promise<GroupNoteRow | null> {
  const res = await fetch(`/api/group/${groupId}/notes/active`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch active group note");
  }
  const json = await res.json();
  return json.data || null;
}

/**
 * 17. Fetch Paginated Notes List for Group
 */
export async function fetchNotesListApi(
  groupId: string,
  limit: number = 20,
  cursor?: string
): Promise<GroupNotesPaginatedResponse> {
  const url = new URL(
    `/api/group/${groupId}/notes`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
  );
  url.searchParams.set("limit", limit.toString());
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch group notes list");
  return res.json();
}

/**
 * 18. Create New Group Note
 */
export async function createNoteApi(
  groupId: string,
  payload: { title: string; content_html: string; content_text: string; locale?: string }
): Promise<GroupNoteRow> {
  const res = await fetch(`/api/group/${groupId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.message || "Failed to create group note");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = json.code;
    throw err;
  }
  return json.data;
}

/**
 * 19. Update Existing Group Note
 */
export async function updateNoteApi(
  groupId: string,
  noteId: string,
  payload: { title?: string; content_html?: string; content_text?: string; locale?: string }
): Promise<GroupNoteRow> {
  const res = await fetch(`/api/group/${groupId}/notes/${noteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.message || "Failed to update group note");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = json.code;
    throw err;
  }
  return json.data;
}

/**
 * 20. Delete Group Note
 */
export async function deleteNoteApi(
  groupId: string,
  noteId: string,
  locale?: string
): Promise<void> {
  const url = locale
    ? `/api/group/${groupId}/notes/${noteId}?locale=${encodeURIComponent(locale)}`
    : `/api/group/${groupId}/notes/${noteId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || "Failed to delete group note");
  }
}

/**
 * 21. Pin Group Note (Make Active)
 */
export async function pinNoteApi(
  groupId: string,
  noteId: string,
  locale?: string
): Promise<GroupNoteRow> {
  const res = await fetch(`/api/group/${groupId}/notes/${noteId}/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });

  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.message || "Failed to pin group note");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = json.code;
    throw err;
  }
  return json.data;
}

/**
 * 22. Unpin Group Note (Deactivate)
 */
export async function unpinNoteApi(
  groupId: string,
  noteId: string,
  locale?: string
): Promise<void> {
  const res = await fetch(`/api/group/${groupId}/notes/${noteId}/unpin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || "Failed to unpin group note");
  }
}

/**
 * 23. Toggle Note Collapsed State
 */
export async function toggleNoteCollapseApi(
  groupId: string,
  noteId: string,
  collapsed: boolean
): Promise<void> {
  const res = await fetch(`/api/group/${groupId}/notes/${noteId}/collapse`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collapsed }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || "Failed to toggle note collapse state");
  }
}

/**
 * 24. Save Message as Pinned Note
 */
export async function pinMessageAsNoteApi(
  groupId: string,
  messageId: string,
  isActive: boolean = false,
  locale?: string
): Promise<GroupNoteRow> {
  const res = await fetch(`/api/group/${groupId}/notes/from-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message_id: messageId, is_active: isActive, locale }),
  });

  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.message || "Failed to save message as note");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = json.code;
    throw err;
  }
  return json.data;
}

/**
 * 25. Fetch All Notes for Bot (Dashboard Management)
 */
export async function fetchGroupNotesForBotApi(botId: string): Promise<GroupNoteRow[]> {
  const res = await fetch(`/api/bots/${botId}/group/notes`);
  if (!res.ok) {
    throw new Error("Failed to fetch group notes for bot");
  }
  const json = await res.json();
  return json.data || [];
}

// Aliases matching alternative conventions
export const fetchGroup = fetchGroupDetailsApi;
export const createGroup = createGroupApi;
export const getActiveNote = fetchActiveNoteApi;
export const listNotes = fetchNotesListApi;
export const createNote = createNoteApi;
export const updateNote = updateNoteApi;
export const pinNote = pinNoteApi;
export const unpinNote = unpinNoteApi;
export const deleteNote = deleteNoteApi;
export const toggleCollapse = toggleNoteCollapseApi;
