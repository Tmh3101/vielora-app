import { NextRequest, NextResponse } from "next/server";
import { addDiscoverJob } from "@/lib/scraper";
import { RenderMode as RenderModeEnum, corsHeaders } from "@/lib/constants";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { EBotStatus, type RenderModeType } from "@/types";
import { getBotByIdServer, updateBotStatusServer } from "@/lib/services/bot.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

interface DiscoverRequest {
  botId: string;
  url: string;
  includeSubdomains?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  renderMode?: RenderModeType;
}

interface DiscoverResponse {
  success: boolean;
  message?: string;
  data?: {
    discoverJobId: string;
    botId: string;
    status: "queued";
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<DiscoverResponse>> {
  try {
    const body: DiscoverRequest = await req.json();
    const {
      botId,
      url,
      includeSubdomains = true,
      includePatterns,
      excludePatterns,
      renderMode = RenderModeEnum.AUTO,
    } = body;

    if (!botId || !url) {
      return NextResponse.json(
        { success: false, message: "botId and url are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { supabase } = authResult;

    const bot = await getBotByIdServer(supabase, botId);

    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (bot.status !== EBotStatus.Ready) {
      await updateBotStatusServer(supabase, botId, EBotStatus.Discovering);
    }

    const discoverJobId = await addDiscoverJob({
      botId,
      startUrl: url,
      config: {
        includeSubdomains,
        includePatterns,
        excludePatterns,
        renderMode,
        useStealth: renderMode !== RenderModeEnum.STATIC,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          discoverJobId,
          botId,
          status: "queued",
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
