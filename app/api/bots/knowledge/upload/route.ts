import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { addIndexerJob } from "@/lib/scraper";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { corsHeaders } from "@/lib/constants";
import {
  EBotStatus,
  EPageStatus,
  EPageSourceType,
  ETransactionType,
  ESubscriptionPlan,
  KnowledgeResponse,
} from "@/types";
import { CREDIT_PER_PAGE, EDIT_KNOWLEDGE_ALLOWED_PLANS } from "@/config";
import { uploadKnowledgeFile, deleteKnowledgeFile } from "@/lib/supabase/upload";
import { deductBotCredits, refundBotCredits } from "@/lib/services/credit.service";
import { getBotActivePlanCode } from "@/lib/services/subscription.service";
import { getBotByOwner, updateBotStatusServer } from "@/lib/services/bot.service";
import { clearBotCache } from "@/lib/services/server/bot-cache.service";
import { insertPageServer, deletePageByIdServer } from "@/lib/services/page.service";
import { extractFileContent } from "@/lib/scraper/extractors/files";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest): Promise<NextResponse<KnowledgeResponse>> {
  try {
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const formData = await req.formData();
    const botId = formData.get("botId") as string | null;
    const file = formData.get("file") as File | null;
    const isOnboarding = formData.get("isOnboarding") === "true";

    if (!botId || !file) {
      return NextResponse.json(
        { success: false, message: "botId and file are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const bot = await getBotByOwner(supabase, botId, user.id);
    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found or access denied" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!isOnboarding) {
      const planCode = await getBotActivePlanCode(supabase, bot);
      if (!planCode || !EDIT_KNOWLEDGE_ALLOWED_PLANS.includes(planCode as ESubscriptionPlan)) {
        return NextResponse.json(
          {
            success: false,
            message: "Upgrade to Standard or Pro plan to unlock this feature.",
          },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // 1. Upload file using Admin Client on Server side (bypasses browser RLS limits)
    const uploadResult = await uploadKnowledgeFile(supabase, file, { botId });
    if (!uploadResult.success || !uploadResult.url) {
      return NextResponse.json(
        { success: false, message: uploadResult.error || "Failed to upload knowledge file" },
        { status: 400, headers: corsHeaders }
      );
    }

    const filePath = uploadResult.url;

    // 2. Deduct credits
    const deductionResult = await deductBotCredits(supabase, bot, {
      creditAmount: CREDIT_PER_PAGE,
      transactionType: ETransactionType.AddKnowledge,
      transactionDescription: `Deducted ${CREDIT_PER_PAGE} credits to add file knowledge for bot ${botId}`,
    });

    if (!deductionResult.success) {
      await deleteKnowledgeFile(supabase, filePath).catch(() => undefined);
      return NextResponse.json(
        {
          success: false,
          message: deductionResult.message || "Insufficient credits to add file knowledge.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Process & extract text from file
    const pageId = randomUUID();
    let pageTitle = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    let normalizedContent = "";

    try {
      const { content, contentHash } = await extractFileContent(file, file.name, file.type);
      normalizedContent = content;
      pageTitle = file.name;
      const pageUrl = `file://${pageId}`;

      await insertPageServer(supabase, {
        id: pageId,
        bot_id: botId,
        url: pageUrl,
        title: pageTitle,
        content: normalizedContent,
        raw_content: filePath,
        content_hash: contentHash,
        source_type: EPageSourceType.File,
        status: EPageStatus.PendingIndex,
        crawled_at: new Date().toISOString(),
      });

      const jobId = await addIndexerJob({
        botId,
        pageId,
      });

      if (isOnboarding ? bot.status !== EBotStatus.Indexing : bot.status !== EBotStatus.Ready) {
        await updateBotStatusServer(supabase, botId, EBotStatus.Indexing);
        clearBotCache(botId).catch(console.error);
      }

      return NextResponse.json(
        {
          success: true,
          message: "Knowledge file uploaded and added successfully",
          data: {
            pageId,
            jobId,
            sourceType: EPageSourceType.File,
          },
        },
        { headers: corsHeaders }
      );
    } catch (err) {
      const error = err as Error;
      await deleteKnowledgeFile(supabase, filePath).catch(() => undefined);
      await deletePageByIdServer(supabase, pageId).catch(() => undefined);

      await refundBotCredits(supabase, bot, {
        deductedFromSubscription: deductionResult.deductedFromSubscription || 0,
        deductedFromPayg: deductionResult.deductedFromPayg || 0,
        transactionType: ETransactionType.AddKnowledgeRefund,
        transactionDescription: `Refunded ${CREDIT_PER_PAGE} credits due to an error while processing file for bot ${botId}`,
      });

      return NextResponse.json(
        { success: false, message: `Failed to add file knowledge: ${error.message}` },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Error uploading knowledge file:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
