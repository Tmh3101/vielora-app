import { NextRequest, NextResponse } from "next/server";
import { addIndexerJobs } from "@/lib/scraper";
import { corsHeaders } from "@/lib/constants";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth";
import { EBotStatus, EPageStatus, ETransactionType } from "@/types";
import { CREDIT_PER_PAGE } from "@/config";
import { deductCredits, refundCredits, CreditDeductionResult } from "@/lib/services/credit.service";
import { getBotByIdServer, updateBotStatusServer } from "@/lib/services/bot.service";
import { getPagesByBotIdServer, updatePagesStatusServer } from "@/lib/services/page.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

interface SelectionRequest {
  botId: string;
  selectedPageIds: string[];
}

interface SelectionResponse {
  success: boolean;
  message?: string;
  data?: {
    botId: string;
    jobIds: string[];
    selectedCount: number;
    ignoredCount: number;
    queuedCount: number;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<SelectionResponse>> {
  try {
    const body: SelectionRequest = await req.json();
    const { botId, selectedPageIds } = body;

    if (!botId || !Array.isArray(selectedPageIds)) {
      return NextResponse.json(
        { success: false, message: "botId and selectedPageIds are required" },
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

    const candidatePages = await getPagesByBotIdServer(supabase, botId);
    const pagesById = new Map(candidatePages.map((page) => [page.id, page]));

    const invalidSelected = selectedPageIds.filter((id) => !pagesById.has(id));
    if (invalidSelected.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "selectedPageIds must belong to this bot and be in discovered state",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const nonPendingSelected = selectedPageIds.filter(
      (id) => pagesById.get(id)?.status !== EPageStatus.Pending
    );
    if (nonPendingSelected.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "selectedPageIds must be in pending state",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const discoveredIds = candidatePages.map((page) => page.id);
    const selectedSet = new Set(selectedPageIds);
    const ignoredPageIds = discoveredIds.filter((id) => !selectedSet.has(id));
    const requiredCredits = selectedPageIds.length * CREDIT_PER_PAGE;
    let deductionResult: CreditDeductionResult = {
      success: true,
      deductedFromSubscription: 0,
      deductedFromPayg: 0,
    };
    let indexerJobIds: string[] = [];

    if (requiredCredits > 0) {
      deductionResult = await deductCredits(supabase, {
        userId: bot.user_id,
        creditAmount: requiredCredits,
        transactionType: ETransactionType.IndexPages,
        transactionDescription: `Deducted ${requiredCredits} credits to index ${selectedPageIds.length} pages for bot ${botId} (${CREDIT_PER_PAGE} credit/page)`,
      });

      if (!deductionResult.success) {
        return NextResponse.json(
          {
            success: false,
            message: deductionResult.message || "Insufficient credits to index the selected pages.",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    try {
      if (ignoredPageIds.length > 0) {
        await updatePagesStatusServer(supabase, ignoredPageIds, EPageStatus.Ignored, {
          botId,
          currentStatus: EPageStatus.Pending,
        });
      }

      if (selectedPageIds.length > 0) {
        await updatePagesStatusServer(supabase, selectedPageIds, EPageStatus.PendingIndex, {
          botId,
        });

        await updateBotStatusServer(supabase, botId, EBotStatus.Indexing);

        indexerJobIds = await addIndexerJobs(selectedPageIds.map((pageId) => ({ botId, pageId })));
      } else {
        await updateBotStatusServer(supabase, botId, EBotStatus.Ready);
      }
    } catch (processingError) {
      const deductedFromSubscription = deductionResult.deductedFromSubscription || 0;
      const deductedFromPayg = deductionResult.deductedFromPayg || 0;

      if (requiredCredits > 0 && (deductedFromSubscription > 0 || deductedFromPayg > 0)) {
        await refundCredits(supabase, {
          userId: bot.user_id,
          deductedFromSubscription,
          deductedFromPayg,
          transactionType: ETransactionType.IndexPagesRefund,
          transactionDescription: `Refunded ${requiredCredits} credits due to an error while queueing indexing for bot ${botId}`,
        });
      }

      throw processingError;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          botId,
          selectedCount: selectedPageIds.length,
          ignoredCount: ignoredPageIds.length,
          queuedCount: selectedPageIds.length,
          jobIds: indexerJobIds,
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
