import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, GROUP_INSUFFICIENT_CREDITS_CODE } from "@/lib/constants";
import { GROUP_CHAT_CONFIG } from "@/config/group-chat";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { listGroupNotes, createGroupNote } from "@/lib/services/group-chat.service";
import {
  checkGroupNoteWritePermission,
  checkGroupNoteReadPermission,
} from "@/lib/helpers/group-note-auth";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    if (!GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED) {
      return NextResponse.json({ error: "disabled" }, { status: 404, headers: corsHeaders });
    }

    const { groupId } = await params;
    if (!groupId) {
      return NextResponse.json(
        { success: false, message: "groupId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const perm = await checkGroupNoteReadPermission(supabase, groupId, user.id);
    if (!perm.allowed) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Not a member of this group" },
        { status: 403, headers: corsHeaders }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const cursor = searchParams.get("cursor") || undefined;

    const data = await listGroupNotes(supabase, groupId, { limit, cursor });
    return NextResponse.json({ success: true, ...data }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching group notes:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    if (!GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED) {
      return NextResponse.json({ error: "disabled" }, { status: 404, headers: corsHeaders });
    }

    const { groupId } = await params;
    if (!groupId) {
      return NextResponse.json(
        { success: false, message: "groupId is required" },
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
        { success: false, message: "Unauthorized: Note creation permission required" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { title, content_html, content_text } = body;

    if (!title?.trim() || !content_text?.trim()) {
      return NextResponse.json(
        { success: false, message: "Title and content cannot be empty" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (title.trim().length > GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Title cannot exceed ${GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH} characters`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (content_text.trim().length > GROUP_CHAT_CONFIG.MAX_NOTE_CONTENT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Content cannot exceed ${GROUP_CHAT_CONFIG.MAX_NOTE_CONTENT_LENGTH} characters`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const note = await createGroupNote(supabase, {
      groupId,
      botId: perm.botId,
      userId: user.id,
      title: title.trim(),
      contentHtml: content_html || content_text,
      contentText: content_text.trim(),
      userName: perm.userName,
    });

    return NextResponse.json({ success: true, data: note }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("Error creating group note:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === GROUP_INSUFFICIENT_CREDITS_CODE) {
      return NextResponse.json(
        {
          success: false,
          code: GROUP_INSUFFICIENT_CREDITS_CODE,
          message:
            error instanceof Error
              ? error.message
              : "Insufficient workspace credits to create note.",
        },
        { status: 402, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
