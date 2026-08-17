import { NextRequest, NextResponse } from "next/server";
import {
  corsHeaders,
  GROUP_ALREADY_PINNED_CODE,
  GROUP_INSUFFICIENT_CREDITS_CODE,
} from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { isBotManager } from "@/lib/services/group-permission.service";
import { listPinnedKnowledge, pinKnowledge } from "@/lib/services/group-chat.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  try {
    const { botId } = await params;
    if (!botId) {
      return NextResponse.json(
        { success: false, message: "botId is required" },
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

    const items = await listPinnedKnowledge(supabase, botId);
    return NextResponse.json({ success: true, data: items }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error listing pinned knowledge:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  try {
    const { botId } = await params;
    if (!botId) {
      return NextResponse.json(
        { success: false, message: "botId is required" },
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

    // Manager or member with can_pin_knowledge check
    const isManager = await isBotManager(supabase, botId, user.id);
    if (!isManager) {
      // Check if user is group member with can_pin_knowledge = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: member } = await (supabase as any)
        .from("group_members")
        .select("can_pin_knowledge")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member || !member.can_pin_knowledge) {
        return NextResponse.json(
          {
            success: false,
            message: "Unauthorized: Only managers or members with pin permission can pin knowledge",
          },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    const body = await req.json();
    const { message_id }: { message_id?: string } = body;

    if (!message_id) {
      return NextResponse.json(
        { success: false, message: "message_id is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const knowledge = await pinKnowledge(supabase, {
      botId,
      messageId: message_id,
      userId: user.id,
    });

    return NextResponse.json(
      { success: true, data: knowledge },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error pinning knowledge:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === GROUP_ALREADY_PINNED_CODE) {
      return NextResponse.json(
        { success: false, code: GROUP_ALREADY_PINNED_CODE, message: "Message is already pinned" },
        { status: 409, headers: corsHeaders }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === GROUP_INSUFFICIENT_CREDITS_CODE) {
      return NextResponse.json(
        {
          success: false,
          code: GROUP_INSUFFICIENT_CREDITS_CODE,
          message: error instanceof Error ? error.message : "Insufficient workspace credits",
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
