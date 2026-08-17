import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { isBotManager } from "@/lib/services/group-permission.service";

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

    const isManager = await isBotManager(supabase, botId, user.id);
    if (!isManager) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You are not a manager of this bot" },
        { status: 403, headers: corsHeaders }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insight, error: err } = await (supabase as any)
      .from("group_chat_insights")
      .select("*")
      .eq("bot_id", botId)
      .maybeSingle();

    if (err) throw err;
    return NextResponse.json({ success: true, data: insight ?? null }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching group chat insights:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
