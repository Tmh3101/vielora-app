import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { isBotManager } from "@/lib/services/group-permission.service";
import { listGroupNotesForBot } from "@/lib/services/group-chat.service";

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

    // Check if user is bot manager or bot owner
    const isManager = await isBotManager(supabase, botId, user.id);
    if (!isManager) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Only bot managers can view group notes" },
        { status: 403, headers: corsHeaders }
      );
    }

    const notes = await listGroupNotesForBot(supabase, botId);
    return NextResponse.json({ success: true, data: notes }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error listing bot group notes:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
