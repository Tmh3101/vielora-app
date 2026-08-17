import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, GROUP_INSUFFICIENT_CREDITS_CODE } from "@/lib/constants";
import { GROUP_CHAT_CONFIG } from "@/config/group-chat";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { updateGroupNote, deleteGroupNote } from "@/lib/services/group-chat.service";
import { checkGroupNoteWritePermission } from "@/lib/helpers/group-note-auth";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; noteId: string }> }
) {
  try {
    if (!GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED) {
      return NextResponse.json({ error: "disabled" }, { status: 404, headers: corsHeaders });
    }

    const { groupId, noteId } = await params;
    if (!groupId || !noteId) {
      return NextResponse.json(
        { success: false, message: "groupId and noteId are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const perm = await checkGroupNoteWritePermission(supabase, groupId, user.id, undefined, {
      full_name: user.user_metadata?.full_name,
      name: user.user_metadata?.name,
      email: user.email,
    });
    if (!perm.allowed || !perm.botId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Note edit permission required" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { title, content_html, content_text } = body;

    if (title !== undefined && title.trim().length > GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Title cannot exceed ${GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH} characters`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (
      content_text !== undefined &&
      content_text.trim().length > GROUP_CHAT_CONFIG.MAX_NOTE_CONTENT_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Content cannot exceed ${GROUP_CHAT_CONFIG.MAX_NOTE_CONTENT_LENGTH} characters`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await updateGroupNote(supabase, {
      noteId,
      groupId,
      botId: perm.botId,
      userId: user.id,
      title: title !== undefined ? title.trim() : undefined,
      contentHtml: content_html,
      contentText: content_text !== undefined ? content_text.trim() : undefined,
      userName: perm.userName,
    });

    return NextResponse.json({ success: true, data: updated }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error updating note:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === GROUP_INSUFFICIENT_CREDITS_CODE) {
      return NextResponse.json(
        {
          success: false,
          code: GROUP_INSUFFICIENT_CREDITS_CODE,
          message:
            error instanceof Error
              ? error.message
              : "Insufficient workspace credits to update note.",
        },
        { status: 402, headers: corsHeaders }
      );
    }

    if (error instanceof Error && error.message === "Note not found") {
      return NextResponse.json(
        { success: false, message: "Note not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; noteId: string }> }
) {
  try {
    if (!GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED) {
      return NextResponse.json({ error: "disabled" }, { status: 404, headers: corsHeaders });
    }

    const { groupId, noteId } = await params;
    if (!groupId || !noteId) {
      return NextResponse.json(
        { success: false, message: "groupId and noteId are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const perm = await checkGroupNoteWritePermission(supabase, groupId, user.id, undefined, {
      full_name: user.user_metadata?.full_name,
      name: user.user_metadata?.name,
      email: user.email,
    });
    if (!perm.allowed || !perm.botId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Note deletion permission required" },
        { status: 403, headers: corsHeaders }
      );
    }

    await deleteGroupNote(supabase, {
      noteId,
      groupId,
      botId: perm.botId,
      userName: perm.userName,
    });

    return NextResponse.json(
      { success: true, message: "Note deleted successfully" },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error deleting note:", error);
    if (error instanceof Error && error.message === "Note not found") {
      return NextResponse.json(
        { success: false, message: "Note not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
