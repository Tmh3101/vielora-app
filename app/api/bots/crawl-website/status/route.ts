import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { corsHeaders } from "@/lib/constants";
import { getJobDetailById, getAllJobStats } from "@/lib/services/job.service";
import { getBotByIdServer } from "@/lib/services/bot.service";
import { getPagesByBotIdServer } from "@/lib/services/page.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

interface JobStatusResponse {
  success: boolean;
  message?: string;
  data?: {
    jobId: string;
    botId: string | null;
    name: string;
    status: string;
    progress: number;
    errorMessage: string | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
  };
}

interface QueueStatusResponse {
  success: boolean;
  data: {
    discover: { pending: number; active: number; completed: number; failed: number };
    indexer: { pending: number; active: number; completed: number; failed: number };
  };
}

interface BotPipelineStatusResponse {
  success: boolean;
  message?: string;
  data?: {
    botId: string;
    botStatus: string;
    counts: Record<string, number>;
  };
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<JobStatusResponse | QueueStatusResponse | BotPipelineStatusResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const botId = searchParams.get("botId");

    const supabase = createAdminClient();

    // ?botId=... → page counts + bot status (used by pollPipelineStatus)
    if (botId) {
      const bot = await getBotByIdServer(supabase, botId);

      if (!bot) {
        return NextResponse.json(
          { success: false, message: "Bot not found" },
          { status: 404, headers: corsHeaders }
        );
      }

      const pages = await getPagesByBotIdServer(supabase, botId);

      const counts = pages.reduce<Record<string, number>>((acc, page) => {
        const key = page.status ?? "unknown";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

      return NextResponse.json(
        { success: true, data: { botId: bot.id, botStatus: bot.status, counts } },
        { headers: corsHeaders }
      );
    }

    // ?jobId=... → single job status from DB
    if (jobId) {
      const job = await getJobDetailById(supabase, jobId);

      if (!job) {
        return NextResponse.json(
          { success: false, message: "Job not found" },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            jobId: job.id,
            botId: job.bot_id,
            name: job.name,
            status: job.status,
            progress: job.progress,
            errorMessage: job.error_message,
            createdAt: job.created_at,
            startedAt: job.started_at,
            finishedAt: job.finished_at,
          },
        },
        { headers: corsHeaders }
      );
    }

    // No params → aggregate queue stats from jobs table
    const jobRows = await getAllJobStats(supabase);

    const empty = { pending: 0, active: 0, completed: 0, failed: 0 };
    const queueStatus = { discover: { ...empty }, indexer: { ...empty } };

    for (const row of jobRows) {
      const queue = row.name === "discover" ? queueStatus.discover : queueStatus.indexer;
      const s = row.status as keyof typeof empty;
      if (s in queue) queue[s] += 1;
    }

    return NextResponse.json({ success: true, data: queueStatus }, { headers: corsHeaders });
  } catch (error) {
    console.error("[API] Error in crawl-status:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
