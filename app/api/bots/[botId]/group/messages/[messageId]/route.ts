import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { isBotManager } from "@/lib/services/group-permission.service";
import { getGroupByBotId, softDeleteGroupMessage } from "@/lib/services/group-chat.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string; messageId: string }> }
) {
  try {
    const { botId, messageId } = await params;
    if (!botId || !messageId) {
      return NextResponse.json(
        { success: false, message: "botId and messageId are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthenticated" },
        { status: 401, headers: corsHeaders }
      );
    }

    const group = await getGroupByBotId(supabase, botId);
    if (!group) {
      return NextResponse.json(
        { success: false, message: "Group chat not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetMessage, error: fetchErr } = await (supabase as any)
      .from("group_messages")
      .select("id, sender_id, group_id")
      .eq("id", messageId)
      .eq("group_id", group.id)
      .maybeSingle();

    if (fetchErr || !targetMessage) {
      return NextResponse.json(
        { success: false, message: "Message not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const isSender = targetMessage.sender_id === user.id;
    const isManager = await isBotManager(supabase, botId, user.id);

    if (!isSender && !isManager) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: You can only delete your own messages" },
        { status: 403, headers: corsHeaders }
      );
    }

    const updated = await softDeleteGroupMessage(supabase, messageId, user.id);
    return NextResponse.json({ success: true, data: updated }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error soft deleting message:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
