import { NextRequest, NextResponse } from "next/server";
import {
  corsHeaders,
  GROUP_ALREADY_PINNED_CODE,
  GROUP_INSUFFICIENT_CREDITS_CODE,
} from "@/lib/constants";
import { GROUP_CHAT_CONFIG } from "@/config/group-chat";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { createNoteFromMessage } from "@/lib/services/group-chat.service";
import { checkGroupNoteWritePermission } from "@/lib/helpers/group-note-auth";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
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
    const { message_id, is_active } = body;

    if (!message_id) {
      return NextResponse.json(
        { success: false, message: "message_id is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const note = await createNoteFromMessage(supabase, {
      groupId,
      botId: perm.botId,
      messageId: message_id,
      userId: user.id,
      userName: perm.userName,
      isActive: Boolean(is_active),
    });

    return NextResponse.json({ success: true, data: note }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("Error creating note from message:", error);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === GROUP_ALREADY_PINNED_CODE) {
      return NextResponse.json(
        {
          success: false,
          code: GROUP_ALREADY_PINNED_CODE,
          message: "Tin nhắn này đã được lưu vào ghi chú trước đó.",
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === GROUP_INSUFFICIENT_CREDITS_CODE) {
      return NextResponse.json(
        {
          success: false,
          code: GROUP_INSUFFICIENT_CREDITS_CODE,
          message:
            error instanceof Error ? error.message : "Insufficient workspace credits to save note.",
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
