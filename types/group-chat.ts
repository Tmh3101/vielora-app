import { EGroupChatStatus } from "@/types/enums";

export class GroupServiceError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "GroupServiceError";
    this.code = code;
  }
}

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
  can_export_report?: boolean;
  canExportReport?: boolean;
  invited_by: string;
  last_read_at: string | null;
  joined_at: string;
}

export interface GroupMessageRow {
  id: string;
  group_id: string;
  sender_type: "user" | "bot" | "system";
  sender_id: string | null;
  content: string;
  reply_to_id: string | null;
  mentions: string[];
  should_bot_reply: boolean;
  no_answer?: boolean | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
}

export interface GroupNoteRow {
  id: string;
  group_id: string;
  bot_id: string;
  created_by: string;
  title: string;
  content_html: string;
  content_text: string;
  is_active: boolean;
  archived_at: string | null;
  collapsed: boolean;
  document_id: string | null;
  source_message_id?: string | null;
  created_at: string;
  updated_at: string;
  // Optional creator profile joins
  creator?: {
    display_name?: string | null;
    full_name?: string | null;
    email?: string | null;
  };
}

export interface CreateNoteFromMessageInput {
  groupId: string;
  botId: string;
  messageId: string;
  userId: string;
  userName: string;
  isActive?: boolean;
}

export interface CreateGroupNoteInput {
  groupId: string;
  botId: string;
  userId: string;
  title: string;
  contentHtml: string;
  contentText: string;
  userName?: string;
}

export interface UpdateGroupNoteInput {
  noteId: string;
  groupId: string;
  botId: string;
  userId: string;
  title?: string;
  contentHtml?: string;
  contentText?: string;
  userName?: string;
}

export interface GroupNotesPaginatedResponse {
  notes: GroupNoteRow[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}
