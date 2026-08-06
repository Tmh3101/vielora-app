import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUserAccessBot } from "@/lib/services/bot.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    if (!jobId) {
      return NextResponse.json(
        { success: false, message: "jobId is required" },
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

    const admin = createAdminClient();

    // Fetch the job
    const { data: job, error: jobError } = await admin
      .from("jobs")
      .select("id, status, progress, data, error_message, bot_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) throw new Error(jobError.message);
    if (!job) {
      return NextResponse.json(
        { success: false, message: "Job not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check access via bot
    if (job.bot_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bot } = await (admin as any)
        .from("bots")
        .select("id, user_id, workspace_id")
        .eq("id", job.bot_id)
        .maybeSingle();

      if (bot) {
        const hasAccess = await canUserAccessBot(supabase, bot, user.id);
        if (!hasAccess) {
          return NextResponse.json(
            { success: false, message: "Forbidden" },
            { status: 403, headers: corsHeaders }
          );
        }
      }
    }

    return NextResponse.json({ success: true, data: job }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
