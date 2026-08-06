import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBotByIdServer, canUserAccessBot } from "@/lib/services/bot.service";

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

    if (!(await canUserAccessBot(supabase, bot, user.id))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403, headers: corsHeaders }
      );
    }

    const adminClient = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminClient as any)
      .from("bot_skills")
      .select("skill_id")
      .eq("bot_id", botId);

    if (error) throw new Error(error.message);

    const skillIds = data?.map((r: { skill_id: string }) => r.skill_id) ?? [];
    return NextResponse.json({ success: true, data: skillIds }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching bot skills:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
