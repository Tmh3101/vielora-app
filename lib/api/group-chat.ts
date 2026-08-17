import { GroupChatRow, GroupMemberRow } from "@/lib/services/group-chat.service";
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

export async function fetchGroup(botId: string): Promise<GroupResponse> {
  const res = await fetch(`/api/bots/${botId}/group`);
  return res.json();
}

export async function createGroup(botId: string): Promise<SingleGroupResponse> {
  const res = await fetch(`/api/bots/${botId}/group`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

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

export async function fetchMembersApi(botId: string): Promise<MembersResponse> {
  const res = await fetch(`/api/bots/${botId}/group/members`);
  return res.json();
}

export async function inviteMemberApi(botId: string, email: string): Promise<SingleMemberResponse> {
  const res = await fetch(`/api/bots/${botId}/group/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function removeMemberApi(
  botId: string,
  memberId: string
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`/api/bots/${botId}/group/members/${memberId}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function updateMemberApi(
  botId: string,
  memberId: string,
  updates: {
    role_label?: string | null;
    can_pin_knowledge?: boolean;
    can_create_note?: boolean;
  }
): Promise<SingleMemberResponse> {
  const res = await fetch(`/api/bots/${botId}/group/members/${memberId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function fetchPinnedKnowledgeApi(botId: string) {
  const res = await fetch(`/api/bots/${botId}/group/knowledge`);
  return res.json();
}

export async function pinMessageApi(botId: string, messageId: string) {
  const res = await fetch(`/api/bots/${botId}/group/knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message_id: messageId }),
  });
  return res.json();
}

export async function pinMessageAsNoteApi(
  groupId: string,
  messageId: string,
  isActive: boolean = false
): Promise<GroupNoteRow> {
  const res = await fetch(`/api/group/${groupId}/notes/from-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message_id: messageId, is_active: isActive }),
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

export async function fetchGroupNotesForBotApi(botId: string): Promise<GroupNoteRow[]> {
  const res = await fetch(`/api/bots/${botId}/group/notes`);
  if (!res.ok) {
    throw new Error("Failed to fetch group notes for bot");
  }
  const json = await res.json();
  return json.data || [];
}

export async function unpinKnowledgeApi(botId: string, knowledgeId: string) {
  const res = await fetch(`/api/bots/${botId}/group/knowledge/${knowledgeId}`, {
    method: "DELETE",
  });
  return res.status === 204;
}

export async function fetchActiveNoteApi(groupId: string): Promise<GroupNoteRow | null> {
  const res = await fetch(`/api/group/${groupId}/notes/active`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch active group note");
  }
  const json = await res.json();
  return json.data || null;
}

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

export async function createNoteApi(
  groupId: string,
  payload: { title: string; content_html: string; content_text: string }
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

export async function updateNoteApi(
  groupId: string,
  noteId: string,
  payload: { title?: string; content_html?: string; content_text?: string }
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

export async function deleteNoteApi(groupId: string, noteId: string): Promise<void> {
  const res = await fetch(`/api/group/${groupId}/notes/${noteId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || "Failed to delete group note");
  }
}

export async function pinNoteApi(groupId: string, noteId: string): Promise<GroupNoteRow> {
  const res = await fetch(`/api/group/${groupId}/notes/${noteId}/pin`, {
    method: "POST",
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

export async function unpinNoteApi(groupId: string, noteId: string): Promise<void> {
  const res = await fetch(`/api/group/${groupId}/notes/${noteId}/unpin`, {
    method: "POST",
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || "Failed to unpin group note");
  }
}

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

// Named aliases matching alternative conventions
export const getActiveNote = fetchActiveNoteApi;
export const listNotes = fetchNotesListApi;
export const createNote = createNoteApi;
export const updateNote = updateNoteApi;
export const pinNote = pinNoteApi;
export const unpinNote = unpinNoteApi;
export const deleteNote = deleteNoteApi;
export const toggleCollapse = toggleNoteCollapseApi;
