import { NextRequest, NextResponse } from "next/server";
import { addIndexerJob } from "@/lib/scraper";
import { hashContent } from "@/lib/helpers/crawl-website-helpers";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth";
import { corsHeaders } from "@/lib/constants";
import { EPageStatus, EPageSourceType, ETransactionType, ESubscriptionPlan } from "@/types";
import { CREDIT_PER_PAGE } from "@/config";
import { deductCredits, refundCredits } from "@/lib/services/credit.service";
import { getUserActivePlanCodeServer } from "@/lib/services/subscription.service";
import { deleteKnowledgeFile } from "@/lib/supabase/upload";
import {
  getPageByIdServer,
  getPageWithOwnerById,
  updatePageServer,
  deletePageByIdServer,
  deleteDocumentsByPageUrl,
} from "@/lib/services/page.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

// Plans that are allowed to add/edit knowledge
const ALLOWED_PLANS = [ESubscriptionPlan.Standard, ESubscriptionPlan.Pro];

interface RouteParams {
  params: Promise<{ pageId: string }>;
}

// DELETE - Remove a knowledge source
export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { pageId } = await params;

    if (!pageId) {
      return NextResponse.json(
        { success: false, message: "pageId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { supabase } = authResult;

    // Fetch the page to get bot_id and url
    const page = await getPageByIdServer(supabase, pageId);

    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const isFileKnowledge =
      page.source_type === EPageSourceType.File || page.url.startsWith("file://");

    if (isFileKnowledge) {
      const filePath = page.raw_content?.trim();
      if (!filePath) {
        console.error("[KnowledgeAPI] Missing storage path for file knowledge", {
          pageId,
          botId: page.bot_id,
          sourceType: page.source_type,
          url: page.url,
        });
        return NextResponse.json(
          {
            success: false,
            message: "Failed to delete knowledge file: missing storage path.",
          },
          { status: 500, headers: corsHeaders }
        );
      }

      const deleteStorageResult = await deleteKnowledgeFile(supabase, filePath);
      if (!deleteStorageResult.success) {
        console.error("[KnowledgeAPI] Delete knowledge file error", {
          pageId,
          botId: page.bot_id,
          filePath,
          error: deleteStorageResult.error,
        });
        return NextResponse.json(
          {
            success: false,
            message: `Failed to delete knowledge file: ${deleteStorageResult.error || "Unknown storage error."}`,
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Transaction: Delete associated document chunks first
    try {
      await deleteDocumentsByPageUrl(supabase, page.bot_id, page.url);
    } catch (deleteDocsErr) {
      const deleteDocsError = deleteDocsErr as Error;
      console.error("[KnowledgeAPI] Delete documents error:", deleteDocsError);
      return NextResponse.json(
        { success: false, message: `Failed to delete document chunks: ${deleteDocsError.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    // Now delete the page record
    try {
      await deletePageByIdServer(supabase, pageId);
    } catch (deletePageErr) {
      const deletePageError = deletePageErr as Error;
      console.error("[KnowledgeAPI] Delete page error:", deletePageError);
      return NextResponse.json(
        { success: false, message: `Failed to delete page: ${deletePageError.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: "Knowledge source deleted successfully" },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[KnowledgeAPI] DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PUT - Edit a knowledge source
interface EditKnowledgeRequest {
  title: string;
  content: string;
}

interface EditKnowledgeResponse {
  success: boolean;
  message?: string;
  changed?: boolean;
  data?: {
    pageId: string;
    jobId?: string;
  };
}

export async function PUT(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<EditKnowledgeResponse | { success: false; message: string }>> {
  try {
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const { pageId } = await params;

    if (!pageId) {
      return NextResponse.json(
        { success: false, message: "pageId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check user's subscription plan
    const planCode = await getUserActivePlanCodeServer(supabase, user.id);

    if (!planCode) {
      return NextResponse.json(
        { success: false, message: "Unable to verify subscription status" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if the user's plan allows editing knowledge
    if (!ALLOWED_PLANS.includes(planCode as ESubscriptionPlan)) {
      return NextResponse.json(
        {
          success: false,
          message: "Upgrade to Standard or Pro plan to unlock this feature.",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    const body: EditKnowledgeRequest = await req.json();
    const { title, content } = body;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, message: "title is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, message: "content is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch the existing page with bot's user_id
    const page = await getPageWithOwnerById(supabase, pageId);

    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Extract user_id from the joined bots table
    const userId = (page.bots as { user_id: string }).user_id;

    // Hash the new content to check if it changed
    const trimmedContent = content.trim();
    const newContentHash = hashContent(trimmedContent);

    // If content hash is the same, no need to re-index
    if (page.content_hash === newContentHash && page.title === title.trim()) {
      return NextResponse.json(
        {
          success: true,
          message: "Content unchanged",
          changed: false,
          data: { pageId },
        },
        { headers: corsHeaders }
      );
    }

    // If original content came from the web, convert edits to manual text.
    const shouldConvertToManual =
      page.source_type === EPageSourceType.Website ||
      page.source_type === EPageSourceType.SingleUrl;
    const newSourceType = shouldConvertToManual ? EPageSourceType.ManualText : page.source_type;
    const newUrl = shouldConvertToManual ? `manual://${pageId}` : page.url;

    // Deduct credits before updating knowledge
    const requiredCredits = CREDIT_PER_PAGE;
    const deductionResult = await deductCredits(supabase, {
      userId,
      creditAmount: requiredCredits,
      transactionType: ETransactionType.UpdateKnowledge,
      transactionDescription: `Deducted ${requiredCredits} credits to update knowledge for bot ${page.bot_id} (${CREDIT_PER_PAGE} credit/page)`,
    });

    if (!deductionResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: deductionResult.message || "Insufficient credits to update knowledge.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete old document chunks before re-indexing
    try {
      await deleteDocumentsByPageUrl(supabase, page.bot_id, page.url);
    } catch (deleteDocsErr) {
      console.error("[KnowledgeAPI] Delete old documents error:", deleteDocsErr);
      // Continue anyway - the new chunks will be added
    }

    // Update the page record
    try {
      await updatePageServer(supabase, pageId, {
        title: title.trim(),
        content: trimmedContent,
        raw_content: trimmedContent,
        content_hash: newContentHash,
        status: EPageStatus.PendingIndex,
        source_type: newSourceType,
        url: newUrl,
        crawled_at: new Date().toISOString(),
      });
    } catch (updateErr) {
      const updateError = updateErr as Error;
      console.error("[KnowledgeAPI] Update page error:", updateError);
      // Refund credits on failure
      await refundCredits(supabase, {
        userId,
        deductedFromSubscription: deductionResult.deductedFromSubscription || 0,
        deductedFromPayg: deductionResult.deductedFromPayg || 0,
        transactionType: ETransactionType.UpdateKnowledgeRefund,
        transactionDescription: `Refunded ${requiredCredits} credits due to an error while updating knowledge for bot ${page.bot_id}`,
      });
      return NextResponse.json(
        { success: false, message: `Failed to update page: ${updateError.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    // Enqueue the indexer job
    let indexerJobId: string | undefined;
    try {
      indexerJobId = await addIndexerJob({
        botId: page.bot_id,
        pageId,
      });
    } catch (queueError) {
      console.error("[KnowledgeAPI] Queue indexer job error:", queueError);
      // Page is updated but not re-indexed - user can manually trigger reindex
    }

    return NextResponse.json(
      {
        success: true,
        message: "Knowledge updated successfully",
        changed: true,
        data: { pageId, jobId: indexerJobId },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[KnowledgeAPI] PUT error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET - Fetch a single knowledge source (for editing)
export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { pageId } = await params;

    if (!pageId) {
      return NextResponse.json(
        { success: false, message: "pageId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { supabase } = authResult;

    const page = await getPageByIdServer(supabase, pageId);

    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: page,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[KnowledgeAPI] GET error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
