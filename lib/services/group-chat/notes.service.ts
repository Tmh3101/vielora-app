import type { ServiceClient } from "@/lib/services/types";
import { GROUP_INSUFFICIENT_CREDITS_CODE } from "@/lib/constants";
import { getGroupChatMessages, GROUP_MESSAGES } from "@/lib/constants/group-chat-messages";
import { EGroupSenderType, ETransactionType } from "@/types/enums";
import { deductWorkspaceCredits, refundWorkspaceCredits } from "@/lib/services/credit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GroupServiceError,
  type GroupNoteRow,
  type CreateGroupNoteInput,
  type UpdateGroupNoteInput,
  type GroupNotesPaginatedResponse,
} from "@/types/group-chat";

/**
 * 1. Helper: Resolve workspaceId and locale from botId
 */
export async function resolveBotWorkspaceId(client: ServiceClient, botId: string): Promise<string> {
  const { data: bot, error } = await client
    .from("bots")
    .select("workspace_id")
    .eq("id", botId)
    .single();

  if (error || !bot?.workspace_id) {
    throw new Error(GROUP_MESSAGES.ERRORS.BOT_WORKSPACE_NOT_FOUND);
  }
  return bot.workspace_id;
}

export async function resolveBotWorkspaceAndLocale(
  client: ServiceClient,
  botId: string,
  providedLocale?: string
): Promise<{ workspaceId: string; locale: string }> {
  const { data: bot, error } = await client
    .from("bots")
    .select("workspace_id, widget_settings")
    .eq("id", botId)
    .single();

  const botLocale =
    providedLocale ||
    (bot?.widget_settings as { ui_language?: string } | null)?.ui_language ||
    "vi";

  if (error || !bot?.workspace_id) {
    const msgs = getGroupChatMessages(botLocale);
    throw new Error(msgs.ERRORS.BOT_WORKSPACE_NOT_FOUND);
  }
  return { workspaceId: bot.workspace_id, locale: botLocale };
}

/**
 * 2. Helper: Insert automated system notification in group_messages using service-role client
 */
export async function insertGroupSystemMessage(
  adminClient: ServiceClient,
  params: {
    groupId: string;
    content: string;
  }
): Promise<void> {
  const { error } = await adminClient.from("group_messages").insert({
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
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
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
  const adminClient = createAdminClient();
  const limit = Math.min(Math.max(options.limit || 20, 1), 50);

  let query = adminClient
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
 * 5. Create Group Note (Saga: Deduct 1 credit, Embed, Insert Document, Trigger Archive Old Active, System Notify)
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
    userName,
    locale: explicitLocale,
  } = input;

  const { workspaceId, locale } = await resolveBotWorkspaceAndLocale(client, botId, explicitLocale);
  const msgs = getGroupChatMessages(locale);
  const safeUserName = userName || msgs.ROLES.DEFAULT_MEMBER;

  // A. Deduct 1 credit atomically via RPC
  const deductRes = await deductWorkspaceCredits(client, {
    workspaceId,
    creditAmount: 1,
    transactionType: ETransactionType.AddKnowledge,
    transactionDescription: `Create group note: ${title.slice(0, 30)}`,
  });

  if (!deductRes.success) {
    throw new GroupServiceError(
      deductRes.message || msgs.ERRORS.INSUFFICIENT_CREDITS_CREATE,
      GROUP_INSUFFICIENT_CREDITS_CODE
    );
  }

  let createdNote: GroupNoteRow | null = null;
  let documentId: string | null = null;

  const adminClient = createAdminClient();
  try {
    // B. Insert note row
    const { data: noteData, error: noteError } = await adminClient
      .from("group_notes")
      .insert({
        group_id: groupId,
        bot_id: botId,
        created_by: userId,
        title,
        content_html: contentHtml,
        content_text: contentText,
        is_active: true,
        collapsed: true,
      })
      .select("*")
      .single();

    if (noteError || !noteData) {
      throw noteError || new Error(msgs.ERRORS.CREATE_NOTE_FAILED);
    }
    createdNote = noteData as GroupNoteRow;

    // C. Generate RAG embedding & insert into documents table
    const formattedDate = new Date(createdNote.created_at || Date.now()).toLocaleString(
      locale.startsWith("en") ? "en-US" : "vi-VN",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
    const contentToEmbed = msgs.NOTE_FORMAT.RAG_EMBEDDING_TEMPLATE(
      title,
      safeUserName,
      formattedDate,
      contentText
    );
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
          source_type: "manual_text",
          group_note_id: createdNote.id,
          group_id: groupId,
          title,
          created_by: userId,
          author_name: safeUserName,
          created_at: createdNote.created_at,
          is_active: true,
        },
      })
      .select("id")
      .single();

    if (docError || !docData) {
      throw docError || new Error(msgs.ERRORS.RAG_INDEX_FAILED);
    }
    documentId = docData.id;

    // Link document_id back to group_notes
    await adminClient
      .from("group_notes")
      .update({ document_id: documentId })
      .eq("id", createdNote.id);

    createdNote.document_id = documentId;

    // D. Insert in-chat system notification
    const safeTitle = title.length > 35 ? `${title.slice(0, 35)}...` : title;
    await insertGroupSystemMessage(adminClient, {
      groupId,
      content: msgs.NOTE_CREATED(safeUserName, safeTitle),
    });

    return createdNote;
  } catch (err) {
    // Saga Rollback: Refund credit and delete partial draft note
    if (createdNote?.id) {
      await adminClient.from("group_notes").delete().eq("id", createdNote.id);
    }
    try {
      await refundWorkspaceCredits(adminClient, {
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
 * 6. Update Group Note (Saga: Deduct 1 credit, Update Note & Document RAG, System Notify)
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
    userName,
    locale: explicitLocale,
  } = input;

  const { workspaceId, locale } = await resolveBotWorkspaceAndLocale(client, botId, explicitLocale);
  const msgs = getGroupChatMessages(locale);
  const safeUserName = userName || msgs.ROLES.DEFAULT_MEMBER;
  const adminClient = createAdminClient();

  const { data: existingNote, error: fetchError } = await adminClient
    .from("group_notes")
    .select("*")
    .eq("id", noteId)
    .eq("group_id", groupId)
    .single();

  if (fetchError || !existingNote) {
    throw new Error(msgs.ERRORS.NOTE_NOT_FOUND);
  }

  const deductRes = await deductWorkspaceCredits(adminClient, {
    workspaceId,
    creditAmount: 1,
    transactionType: ETransactionType.UpdateKnowledge,
    transactionDescription: `Update group note: ${(title || existingNote.title).slice(0, 30)}`,
  });

  if (!deductRes.success) {
    throw new GroupServiceError(
      deductRes.message || msgs.ERRORS.INSUFFICIENT_CREDITS_UPDATE,
      GROUP_INSUFFICIENT_CREDITS_CODE
    );
  }

  try {
    const updatedTitle = title !== undefined ? title : existingNote.title;
    const updatedHtml = contentHtml !== undefined ? contentHtml : existingNote.content_html;
    const updatedText = contentText !== undefined ? contentText : existingNote.content_text;

    const { data: updatedNote, error: updateError } = await adminClient
      .from("group_notes")
      .update({
        title: updatedTitle,
        content_html: updatedHtml,
        content_text: updatedText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId)
      .eq("group_id", groupId)
      .select("*")
      .single();

    if (updateError || !updatedNote) {
      throw updateError || new Error("Failed to update group note");
    }

    // Update RAG Document Embedding
    if (existingNote.document_id) {
      const formattedDate = new Date(existingNote.created_at || Date.now()).toLocaleString(
        locale.startsWith("en") ? "en-US" : "vi-VN",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
      const contentToEmbed = msgs.NOTE_FORMAT.RAG_EMBEDDING_TEMPLATE(
        updatedTitle,
        safeUserName,
        formattedDate,
        updatedText
      );
      const { generateEmbedding } = await import("@/lib/rag/generative");
      const embedding = await generateEmbedding({ text: contentToEmbed });

      await adminClient
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
            created_by: existingNote.created_by,
            author_name: safeUserName,
            created_at: existingNote.created_at,
            is_active: existingNote.is_active,
          },
        })
        .eq("id", existingNote.document_id);
    }

    const safeTitle = updatedTitle.length > 35 ? `${updatedTitle.slice(0, 35)}...` : updatedTitle;
    await insertGroupSystemMessage(adminClient, {
      groupId,
      content: msgs.NOTE_UPDATED(safeUserName, safeTitle),
    });

    return updatedNote as GroupNoteRow;
  } catch (err) {
    try {
      await refundWorkspaceCredits(adminClient, {
        workspaceId,
        deductedFromSubscription: deductRes.deductedFromSubscription ?? 0,
        deductedFromPayg: deductRes.deductedFromPayg ?? 0,
        transactionType: ETransactionType.UpdateKnowledgeRefund,
        transactionDescription: `Refund credit: Failed to update group note (${noteId.slice(0, 8)})`,
      });
    } catch (refundErr) {
      console.error("Critical error refunding credits after note update failure:", refundErr);
    }
    throw err;
  }
}

/**
 * 7. Delete Group Note
 */
export async function deleteGroupNote(
  client: ServiceClient,
  params: {
    noteId: string;
    groupId: string;
    botId?: string;
    userName?: string;
    locale?: string;
  }
): Promise<void> {
  const { noteId, groupId, botId, userName, locale: explicitLocale } = params;
  const adminClient = createAdminClient();

  let locale = explicitLocale;
  if (!locale && botId) {
    const { data: bot } = await adminClient
      .from("bots")
      .select("widget_settings")
      .eq("id", botId)
      .maybeSingle();
    locale = (bot?.widget_settings as { ui_language?: string } | null)?.ui_language || "vi";
  }
  const msgs = getGroupChatMessages(locale);
  const safeUserName = userName || msgs.ROLES.DEFAULT_MEMBER;

  const { data: note, error: fetchError } = await adminClient
    .from("group_notes")
    .select("id, title, document_id")
    .eq("id", noteId)
    .eq("group_id", groupId)
    .single();

  if (fetchError || !note) {
    throw new Error(msgs.ERRORS.NOTE_NOT_FOUND);
  }

  if (note.document_id) {
    await adminClient.from("documents").delete().eq("id", note.document_id);
  }

  const { error: deleteError } = await adminClient.from("group_notes").delete().eq("id", noteId);

  if (deleteError) {
    console.error("Error deleting group note:", deleteError);
    throw deleteError;
  }

  const safeTitle = note.title.length > 35 ? `${note.title.slice(0, 35)}...` : note.title;
  await insertGroupSystemMessage(adminClient, {
    groupId,
    content: msgs.NOTE_DELETED(safeUserName, safeTitle),
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
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("group_notes").update({ collapsed }).eq("id", noteId);

  if (error) {
    console.error("Error toggling note collapse:", error);
    throw error;
  }
}

/**
 * 9. Unpin Group Note
 */
export async function unpinGroupNote(
  client: ServiceClient,
  params: {
    noteId: string;
    groupId: string;
    userName?: string;
    locale?: string;
  }
): Promise<void> {
  const { noteId, groupId, userName, locale } = params;
  const adminClient = createAdminClient();
  const msgs = getGroupChatMessages(locale);
  const safeUserName = userName || msgs.ROLES.DEFAULT_MEMBER;

  const { data: note, error: fetchError } = await adminClient
    .from("group_notes")
    .select("id, title")
    .eq("id", noteId)
    .eq("group_id", groupId)
    .single();

  if (fetchError || !note) {
    throw new Error(msgs.ERRORS.NOTE_NOT_FOUND);
  }

  const { error: updateError } = await adminClient
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

  const safeTitle = note.title.length > 35 ? `${note.title.slice(0, 35)}...` : note.title;
  await insertGroupSystemMessage(adminClient, {
    groupId,
    content: msgs.NOTE_UNPINNED(safeUserName, safeTitle),
  });
}

/**
 * 10. Pin Group Note
 */
export async function pinGroupNote(
  client: ServiceClient,
  params: {
    noteId: string;
    groupId: string;
    userName?: string;
    locale?: string;
  }
): Promise<GroupNoteRow> {
  const { noteId, groupId, userName, locale } = params;
  const adminClient = createAdminClient();
  const msgs = getGroupChatMessages(locale);
  const safeUserName = userName || msgs.ROLES.DEFAULT_MEMBER;

  const { data: note, error: fetchError } = await adminClient
    .from("group_notes")
    .select("*")
    .eq("id", noteId)
    .eq("group_id", groupId)
    .single();

  if (fetchError || !note) {
    throw new Error(msgs.ERRORS.NOTE_NOT_FOUND);
  }

  const { data: updated, error: updateError } = await adminClient
    .from("group_notes")
    .update({
      is_active: true,
      archived_at: null,
      collapsed: true,
    })
    .eq("id", noteId)
    .eq("group_id", groupId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error("Error pinning group note:", updateError);
    throw updateError;
  }

  const safeTitle = note.title.length > 35 ? `${note.title.slice(0, 35)}...` : note.title;
  await insertGroupSystemMessage(adminClient, {
    groupId,
    content: msgs.NOTE_PINNED(safeUserName, safeTitle),
  });

  return updated as GroupNoteRow;
}

/**
 * 11. List Group Notes for Bot (Dashboard Management)
 */
export async function listGroupNotesForBot(
  client: ServiceClient,
  botId: string
): Promise<GroupNoteRow[]> {
  const adminClient = createAdminClient();
  const { data: group } = await adminClient
    .from("group_chats")
    .select("id")
    .eq("bot_id", botId)
    .maybeSingle();

  if (!group) return [];

  const { data: notes, error } = await adminClient
    .from("group_notes")
    .select("*")
    .eq("group_id", group.id)
    .order("created_at", { ascending: false });

  if (error || !notes) return [];

  const { data: members } = await adminClient
    .from("group_members")
    .select("user_id, role_label, email")
    .eq("group_id", group.id);

  const memberMap = new Map<
    string,
    { display_name?: string | null; full_name?: string | null; email?: string | null }
  >();
  if (members) {
    for (const m of members) {
      memberMap.set(m.user_id, {
        display_name: m.role_label || (m.email ? m.email.split("@")[0] : null),
        full_name: null,
        email: m.email,
      });
    }
  }

  return (notes as GroupNoteRow[]).map((note) => ({
    ...note,
    creator: memberMap.get(note.created_by) || undefined,
  }));
}
