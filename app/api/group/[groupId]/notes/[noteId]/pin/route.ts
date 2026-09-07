import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { GROUP_CHAT_CONFIG } from "@/config/group-chat";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { pinGroupNote } from "@/lib/services/group-chat.service";
import { checkGroupNoteWritePermission } from "@/lib/helpers/group-note-auth";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(
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
      display_name: user.user_metadata?.display_name,
      full_name: user.user_metadata?.full_name,
      name: user.user_metadata?.name,
      email: user.email,
    });
    if (!perm.allowed || !perm.botId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Note pin permission required" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json().catch(() => ({}));
    const note = await pinGroupNote(supabase, {
      noteId,
      groupId,
      userName: perm.userName,
      locale: body?.locale || perm.botLocale,
    });

    return NextResponse.json(
      { success: true, data: note, message: "Note pinned successfully" },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error pinning note:", error);
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
