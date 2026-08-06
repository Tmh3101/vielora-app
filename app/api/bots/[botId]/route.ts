import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import {
  getBotByIdServer,
  canUserAccessBot,
  canUserDeleteBot,
  deleteBot,
} from "@/lib/services/bot.service";

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
        { success: false, message: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const bot = await getBotByIdServer(supabase, botId);
    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const hasAccess = await canUserAccessBot(supabase, bot, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, data: bot }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching bot details:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
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
        { success: false, message: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const bot = await getBotByIdServer(supabase, botId);
    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const canDelete = await canUserDeleteBot(supabase, bot, user.id);
    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền xóa chatbot này." },
        { status: 403, headers: corsHeaders }
      );
    }

    await deleteBot(supabase, botId);

    return NextResponse.json(
      { success: true, message: "Xóa chatbot thành công." },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error deleting bot via API:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
