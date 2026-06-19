import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { addIndexerJob, addSingleUrlCrawlJob } from "@/lib/scraper";
import { RenderMode as RenderModeEnum, corsHeaders } from "@/lib/constants";
import { hashContent, isBotRootUrl, normalizeKnowledgeUrl } from "@/lib/helpers";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import {
  EPageStatus,
  EBotStatus,
  EPageSourceType,
  ETransactionType,
  ESubscriptionPlan,
  KnowledgeResponse,
  KnowledgeRequest,
} from "@/types";
import {
  MAX_MANUAL_CONTENT_LENGTH,
  MAX_MANUAL_TITLE_LENGTH,
  CREDIT_PER_PAGE,
  MAX_KNOWLEDGE_FILE_SIZE,
  SINGLE_URL_CRAWL_TIMEOUT_MS,
  EDIT_KNOWLEDGE_ALLOWED_PLANS,
} from "@/config";
import { deductCredits, refundCredits } from "@/lib/services/credit.service";
import { getUserActivePlanCodeServer } from "@/lib/services/subscription.service";
import { getBotByOwner, updateBotStatusServer } from "@/lib/services/bot.service";
import { clearBotCache } from "@/lib/services/server/bot-cache.service";
import {
  deletePageByIdServer,
  getPageByBotIdAndUrlServer,
  insertPageServer,
} from "@/lib/services/page.service";
import { deleteKnowledgeFile } from "@/lib/supabase/upload";
import { extractTextFromFile } from "@/lib/scraper/extractors/files";
import { KNOWLEDGE_REQUEST_MODE } from "@/lib/constants/knowledge";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest): Promise<NextResponse<KnowledgeResponse>> {
  try {
    const body = (await req.json()) as KnowledgeRequest;
    const { botId, title, content, url, filePath } = body;
    const mode = body.mode ?? KNOWLEDGE_REQUEST_MODE.MANUAL;
    const isOnboardingContext = body.context === "onboarding";
    const isManual = mode === KNOWLEDGE_REQUEST_MODE.MANUAL;
    const isFileMode = mode === KNOWLEDGE_REQUEST_MODE.FILE;
    const isUrlMode = mode === KNOWLEDGE_REQUEST_MODE.URL;

    // Validate required fields
    if (!botId) {
      return NextResponse.json(
        { success: false, message: "botId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    if (!isManual && !isFileMode && !isUrlMode) {
      return NextResponse.json(
        { success: false, message: "mode must be manual, file, or url" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate source-specific fields
    if (isFileMode) {
      if (!filePath?.trim()) {
        return NextResponse.json(
          { success: false, message: "filePath is required for file mode" },
          { status: 400, headers: corsHeaders }
        );
      }
    } else if (isManual) {
      if (!title?.trim()) {
        return NextResponse.json(
          { success: false, message: "title is required for manual text entries" },
          { status: 400, headers: corsHeaders }
        );
      }
      if (title.length > MAX_MANUAL_TITLE_LENGTH) {
        return NextResponse.json(
          {
            success: false,
            message: `title exceeds maximum length of ${MAX_MANUAL_TITLE_LENGTH} characters`,
          },
          { status: 400, headers: corsHeaders }
        );
      }
      if (!content?.trim()) {
        return NextResponse.json(
          { success: false, message: "content is required for manual text entries" },
          { status: 400, headers: corsHeaders }
        );
      }
      if (content.length > MAX_MANUAL_CONTENT_LENGTH) {
        return NextResponse.json(
          {
            success: false,
            message: `content exceeds maximum length of ${MAX_MANUAL_CONTENT_LENGTH} characters`,
          },
          { status: 400, headers: corsHeaders }
        );
      }
    } else if (isUrlMode) {
      // Validate website-specific fields
      if (!url?.trim()) {
        return NextResponse.json(
          { success: false, message: "url is required for URL entries" },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Verify bot exists and belongs to the authenticated user.
    const bot = await getBotByOwner(supabase, botId, user.id);

    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const crawlSettings =
      bot.crawl_settings &&
      typeof bot.crawl_settings === "object" &&
      !Array.isArray(bot.crawl_settings)
        ? (bot.crawl_settings as Record<string, unknown>)
        : {};
    const isFileOnboardingBot = crawlSettings.onboardingSourceMode === "files";
    const isBotInOnboarding =
      bot.status === EBotStatus.Pending || bot.status === EBotStatus.Indexing;

    if (isOnboardingContext && (!isFileMode || !isFileOnboardingBot || !isBotInOnboarding)) {
      return NextResponse.json(
        { success: false, message: "Invalid onboarding knowledge request." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isOnboardingContext) {
      // Check user's subscription plan
      const planCode = await getUserActivePlanCodeServer(supabase, user.id);

      if (!planCode) {
        return NextResponse.json(
          { success: false, message: "Unable to verify subscription status" },
          { status: 403, headers: corsHeaders }
        );
      }

      // Check if the user's plan allows adding knowledge
      if (!EDIT_KNOWLEDGE_ALLOWED_PLANS.includes(planCode as ESubscriptionPlan)) {
        return NextResponse.json(
          {
            success: false,
            message: "Upgrade to Standard or Pro plan to unlock this feature.",
          },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    const normalizedPath = filePath?.trim() || "";
    const pathParts = normalizedPath.split("/");
    if (
      isFileMode &&
      (pathParts.length !== 2 ||
        pathParts[0] !== botId ||
        pathParts.includes("..") ||
        pathParts.includes("."))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid file path for this bot" },
        { status: 400, headers: corsHeaders }
      );
    }

    let normalizedUrl: string | null = null;
    if (isUrlMode) {
      normalizedUrl = normalizeKnowledgeUrl(url || "");
      if (!normalizedUrl) {
        return NextResponse.json(
          { success: false, message: "URL must be a valid http or https URL." },
          { status: 400, headers: corsHeaders }
        );
      }

      if (isBotRootUrl(normalizedUrl, bot)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Use Reindex to crawl the bot's root website. URL knowledge is for a single article or document page.",
          },
          { status: 400, headers: corsHeaders }
        );
      }

      const existingPage = await getPageByBotIdAndUrlServer(supabase, botId, normalizedUrl);
      if (existingPage) {
        return NextResponse.json(
          { success: false, message: "This URL already exists for this bot." },
          { status: 409, headers: corsHeaders }
        );
      }
    }

    const deductionResult = await deductCredits(supabase, {
      userId: bot.user_id,
      creditAmount: CREDIT_PER_PAGE,
      transactionType: ETransactionType.AddKnowledge,
      transactionDescription: `Deducted ${CREDIT_PER_PAGE} credits to add knowledge for bot ${botId} (${CREDIT_PER_PAGE} credit/page)`,
    });

    if (!deductionResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: deductionResult.message || "Insufficient credits to add knowledge.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (isManual || isFileMode) {
      const pageId = randomUUID();
      const sourceType = isFileMode ? EPageSourceType.File : EPageSourceType.ManualText;
      let pageUrl = `manual://${pageId}`;
      let pageTitle = title?.trim() || "";
      let normalizedContent = content?.trim() || "";
      let rawContent: string | null = null;
      let jobId: string;

      try {
        if (isFileMode && filePath) {
          const normalizedFilePath = filePath.trim();
          rawContent = normalizedFilePath;

          const { data: fileBlob, error: downloadError } = await supabase.storage
            .from("knowledge_files")
            .download(normalizedFilePath);

          if (downloadError || !fileBlob) {
            throw new Error(downloadError?.message || "Failed to download uploaded file");
          }

          if (fileBlob.size > MAX_KNOWLEDGE_FILE_SIZE) {
            throw new Error("File is too large. Maximum file size is 10MB.");
          }

          const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
          const storedFileName = normalizedFilePath.split("/").pop() || "knowledge-file";
          normalizedContent = await extractTextFromFile(
            fileBuffer,
            storedFileName,
            fileBlob.type || undefined
          );
          pageTitle = storedFileName.replace(/^[0-9a-fA-F-]{36}-/, "");
          pageUrl = `file://${pageId}`;
        }

        await insertPageServer(supabase, {
          id: pageId,
          bot_id: botId,
          url: pageUrl,
          title: pageTitle,
          content: normalizedContent,
          raw_content: rawContent ?? normalizedContent,
          content_hash: hashContent(normalizedContent),
          source_type: sourceType,
          status: EPageStatus.PendingIndex,
          crawled_at: new Date().toISOString(),
        });

        jobId = await addIndexerJob({
          botId,
          pageId,
        });

        if (bot.status !== EBotStatus.Ready) {
          await updateBotStatusServer(supabase, botId, EBotStatus.Indexing);
          clearBotCache(botId).catch(console.error);
        }
      } catch (manualOrFileErr) {
        const manualOrFileError = manualOrFileErr as Error;

        if (isFileMode && rawContent) {
          await deleteKnowledgeFile(supabase, rawContent).catch((err) =>
            console.error("[KnowledgeAPI] Failed to cleanup orphaned file", err)
          );
        }

        await deletePageByIdServer(supabase, pageId).catch((err) =>
          console.error("[KnowledgeAPI] Failed to cleanup orphaned page", err)
        );

        await refundCredits(supabase, {
          userId: bot.user_id,
          deductedFromSubscription: deductionResult.deductedFromSubscription || 0,
          deductedFromPayg: deductionResult.deductedFromPayg || 0,
          transactionType: ETransactionType.AddKnowledgeRefund,
          transactionDescription: `Refunded ${CREDIT_PER_PAGE} credits due to an error while adding knowledge for bot ${botId}`,
        });
        return NextResponse.json(
          { success: false, message: `Failed to add knowledge: ${manualOrFileError.message}` },
          { status: 500, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Knowledge added successfully",
          data: {
            pageId,
            jobId,
            sourceType,
          },
        },
        { headers: corsHeaders }
      );
    } else {
      const pageId = randomUUID();
      try {
        await insertPageServer(supabase, {
          id: pageId,
          bot_id: botId,
          url: normalizedUrl!,
          title: normalizedUrl!,
          content: null,
          raw_content: null,
          content_hash: null,
          source_type: EPageSourceType.SingleUrl,
          status: EPageStatus.Processing,
          crawled_at: new Date().toISOString(),
        });

        const jobId = await addSingleUrlCrawlJob({
          botId,
          pageId,
          url: normalizedUrl!,
          config: {
            maxPages: 1,
            maxDepth: 0,
            timeout: SINGLE_URL_CRAWL_TIMEOUT_MS,
            renderMode: RenderModeEnum.AUTO,
            useStealth: true,
            transformRelativeUrls: true,
          },
          creditRefund: {
            userId: bot.user_id,
            deductedFromSubscription: deductionResult.deductedFromSubscription || 0,
            deductedFromPayg: deductionResult.deductedFromPayg || 0,
            creditAmount: CREDIT_PER_PAGE,
          },
        });

        if (bot.status !== EBotStatus.Indexing) {
          await updateBotStatusServer(supabase, botId, EBotStatus.Indexing);
          clearBotCache(botId).catch(console.error);
        }

        return NextResponse.json(
          {
            success: true,
            message: "Knowledge added successfully",
            data: {
              pageId,
              jobId,
              sourceType: EPageSourceType.SingleUrl,
            },
          },
          { headers: corsHeaders }
        );
      } catch (urlErr) {
        const urlError = urlErr as Error;

        await deletePageByIdServer(supabase, pageId).catch(() => undefined);
        await refundCredits(supabase, {
          userId: bot.user_id,
          deductedFromSubscription: deductionResult.deductedFromSubscription || 0,
          deductedFromPayg: deductionResult.deductedFromPayg || 0,
          transactionType: ETransactionType.AddKnowledgeRefund,
          transactionDescription: `Refunded ${CREDIT_PER_PAGE} credits due to an error while adding URL knowledge for bot ${botId}`,
        });

        return NextResponse.json(
          { success: false, message: urlError.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }
  } catch (error) {
    console.error("[KnowledgeAPI] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
