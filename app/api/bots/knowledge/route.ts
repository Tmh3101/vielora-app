import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { addIndexerJob, addSingleUrlCrawlJob } from "@/lib/scraper";
import { RenderMode as RenderModeEnum, corsHeaders } from "@/lib/constants";
import { hashContent } from "@/lib/helpers/crawl-website-helpers";
import { isBotRootUrl } from "@/lib/helpers/url-helpers";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth";
import { normalizeKnowledgeUrl } from "@/lib/helpers/url-helpers";
import {
  EPageStatus,
  EBotStatus,
  EPageSourceType,
  ETransactionType,
  ESubscriptionPlan,
} from "@/types";
import { MAX_MANUAL_CONTENT_LENGTH, MAX_MANUAL_TITLE_LENGTH, CREDIT_PER_PAGE } from "@/config";
import { MAX_KNOWLEDGE_FILE_SIZE, SINGLE_URL_CRAWL_TIMEOUT_MS } from "@/config/knowledge";
import { deductCredits, refundCredits } from "@/lib/services/credit.service";
import { getUserActivePlanCodeServer } from "@/lib/services/subscription.service";
import { getBotByOwner, updateBotStatusServer } from "@/lib/services/bot.service";
import {
  deletePageByIdServer,
  getPageByBotIdAndUrlServer,
  insertPageServer,
} from "@/lib/services/page.service";
import { uploadKnowledgeFile, deleteKnowledgeFile } from "@/lib/supabase/upload";
import { extractTextFromFile } from "@/lib/scraper/extractors/files";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

// Plans that are allowed to add/edit knowledge
const ALLOWED_PLANS = [ESubscriptionPlan.Standard, ESubscriptionPlan.Pro];

interface KnowledgeRequest {
  botId?: string;
  isManual?: boolean;
  mode?: "manual" | "file" | "url";
  title?: string;
  content?: string;
  url?: string;
}

interface KnowledgeResponse {
  success: boolean;
  message?: string;
  data?: {
    pageId: string;
    jobId: string;
    sourceType: EPageSourceType;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<KnowledgeResponse>> {
  try {
    const contentType = req.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");

    let body: KnowledgeRequest = {};
    let uploadedFile: File | null = null;

    if (isMultipart) {
      const formData = await req.formData();
      body = {
        botId: String(formData.get("botId") || ""),
        mode: "file",
      };
      const fileField = formData.get("file");
      if (fileField instanceof File) {
        uploadedFile = fileField;
      }
    } else {
      body = (await req.json()) as KnowledgeRequest;
    }

    const { botId, title, content, url } = body;
    const mode = body.mode ?? "manual";
    const isManual = mode === "manual";
    const isFileMode = mode === "file";
    const isUrlMode = mode === "url";

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

    // Check user's subscription plan
    const planCode = await getUserActivePlanCodeServer(supabase, user.id);

    if (!planCode) {
      return NextResponse.json(
        { success: false, message: "Unable to verify subscription status" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if the user's plan allows adding knowledge
    if (!ALLOWED_PLANS.includes(planCode as ESubscriptionPlan)) {
      return NextResponse.json(
        {
          success: false,
          message: "Upgrade to Standard or Pro plan to unlock this feature.",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    if (!isManual && !isFileMode && !isUrlMode) {
      return NextResponse.json(
        { success: false, message: "mode must be manual, file, or url" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate manual-specific fields
    if (isFileMode) {
      if (!uploadedFile) {
        return NextResponse.json(
          { success: false, message: "file is required for file mode" },
          { status: 400, headers: corsHeaders }
        );
      }
      if (uploadedFile.size > MAX_KNOWLEDGE_FILE_SIZE) {
        return NextResponse.json(
          { success: false, message: "File is too large. Maximum file size is 10MB." },
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

    const requiredCredits = CREDIT_PER_PAGE;
    const deductionResult = await deductCredits(supabase, {
      userId: bot.user_id,
      creditAmount: requiredCredits,
      transactionType: ETransactionType.AddKnowledge,
      transactionDescription: `Deducted ${requiredCredits} credits to add knowledge for bot ${botId} (${CREDIT_PER_PAGE} credit/page)`,
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

      try {
        if (isFileMode && uploadedFile) {
          const uploadResult = await uploadKnowledgeFile(supabase, uploadedFile, botId);
          if (!uploadResult.success || !uploadResult.url) {
            throw new Error(uploadResult.error || "Failed to upload file");
          }

          const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());
          normalizedContent = await extractTextFromFile(
            fileBuffer,
            uploadedFile.name,
            uploadedFile.type
          );
          pageTitle = uploadedFile.name;
          pageUrl = `file://${pageId}`;
          rawContent = uploadResult.url;
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
      } catch (insertErr) {
        const insertError = insertErr as Error;

        if (isFileMode && rawContent) {
          await deleteKnowledgeFile(supabase, rawContent).catch((err) =>
            console.error("[KnowledgeAPI] Failed to cleanup orphaned file", err)
          );
        }

        await refundCredits(supabase, {
          userId: bot.user_id,
          deductedFromSubscription: deductionResult.deductedFromSubscription || 0,
          deductedFromPayg: deductionResult.deductedFromPayg || 0,
          transactionType: ETransactionType.AddKnowledgeRefund,
          transactionDescription: `Refunded ${requiredCredits} credits due to an error while adding knowledge for bot ${botId}`,
        });
        return NextResponse.json(
          { success: false, message: `Failed to create page: ${insertError.message}` },
          { status: 500, headers: corsHeaders }
        );
      }

      const jobId = await addIndexerJob({
        botId,
        pageId,
      });

      if (bot.status !== EBotStatus.Ready) {
        await updateBotStatusServer(supabase, botId, EBotStatus.Indexing);
      }

      return NextResponse.json(
        {
          success: true,
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
            creditAmount: requiredCredits,
          },
        });

        if (bot.status !== EBotStatus.Indexing) {
          await updateBotStatusServer(supabase, botId, EBotStatus.Indexing);
        }

        return NextResponse.json(
          {
            success: true,
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
          transactionDescription: `Refunded ${requiredCredits} credits due to an error while adding URL knowledge for bot ${botId}`,
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
