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
