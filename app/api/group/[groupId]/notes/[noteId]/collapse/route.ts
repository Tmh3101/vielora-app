import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { GROUP_CHAT_CONFIG } from "@/config/group-chat";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { toggleGroupNoteCollapse } from "@/lib/services/group-chat.service";
import { checkGroupNoteReadPermission } from "@/lib/helpers/group-note-auth";

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

    // Verify membership / read permission
    const perm = await checkGroupNoteReadPermission(supabase, groupId, user.id, user.email);
    if (!perm.allowed) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Not a member of this group" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { collapsed } = body;
    await toggleGroupNoteCollapse(supabase, noteId, !!collapsed);

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error toggling collapse:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
