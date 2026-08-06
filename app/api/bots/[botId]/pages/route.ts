import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { getBotByIdServer, canUserAccessBot } from "@/lib/services/bot.service";
import { getPagesByBotId } from "@/lib/services/page.service";
import { EPageStatus } from "@/types";

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

    // Parse statuses from query param, default to knowledge tab statuses
    const statusesParam = req.nextUrl.searchParams.get("statuses");
    const statuses: EPageStatus[] = statusesParam
      ? (statusesParam.split(",") as EPageStatus[])
      : [EPageStatus.Completed, EPageStatus.PendingIndex, EPageStatus.Processing];

    // Allow selecting specific fields via query param
    const fieldsParam = req.nextUrl.searchParams.get("fields");

    let pages;
    if (fieldsParam) {
      // Custom field selection via adminClient
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      let query = admin
        .from("pages")
        .select(fieldsParam)
        .eq("bot_id", botId)
        .order("crawled_at", { ascending: false });

      if (statuses.length > 0) {
        query = query.in("status", statuses);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      pages = data ?? [];
    } else {
      pages = await getPagesByBotId(supabase, botId, statuses);
    }

    return NextResponse.json({ success: true, data: pages }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching bot pages:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
