import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { addIndexerJob } from "@/lib/scraper";
import { corsHeaders } from "@/lib/constants";
import { hashContent } from "@/lib/helpers/crawl-website-helpers";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth";
import {
  EPageStatus,
  EBotStatus,
  EPageSourceType,
  ETransactionType,
  ESubscriptionPlan,
} from "@/types";
import { MAX_MANUAL_CONTENT_LENGTH, MAX_MANUAL_TITLE_LENGTH, CREDIT_PER_PAGE } from "@/config";
import { MAX_KNOWLEDGE_FILE_SIZE } from "@/config/knowledge";
import { deductCredits, refundCredits } from "@/lib/services/credit.service";
import { getUserActivePlanCodeServer } from "@/lib/services/subscription.service";
import { getBotByIdServer, updateBotStatusServer } from "@/lib/services/bot.service";
import { insertPageServer } from "@/lib/services/page.service";
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
  mode?: "manual" | "file";
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

    if (!isManual && !isFileMode) {
      return NextResponse.json(
        { success: false, message: "mode must be either manual or file" },
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
    } else {
      // Validate website-specific fields
      if (!url?.trim()) {
        return NextResponse.json(
          { success: false, message: "url is required for website entries" },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Verify bot exists
    const bot = await getBotByIdServer(supabase, botId);

    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (isManual || isFileMode) {
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
      // TODO: Handle website URL entry - use existing discover flow
      return NextResponse.json(
        { success: false, message: "Website URL entry is not implemented yet" },
        { status: 501, headers: corsHeaders }
      );
      //   // Handle website URL entry - use existing discover flow
      //   const normalizedUrl = url!.trim();
      //   // Check if page already exists for this bot
      //   const { data: existingPage } = await supabase
      //     .from("pages")
      //     .select("id")
      //     .eq("bot_id", botId)
      //     .eq("url", normalizedUrl)
      //     .single();
      //   if (existingPage) {
      //     return NextResponse.json(
      //       { success: false, message: "This URL already exists for this bot" },
      //       { status: 409, headers: corsHeaders }
      //     );
      //   }
      //   // Insert page record with pending status (crawler will fetch content)
      //   const pageId = randomUUID();
      //   const { error: insertError } = await supabase.from("pages").insert({
      //     id: pageId,
      //     bot_id: botId,
      //     url: normalizedUrl,
      //     title: title?.trim() || null,
      //     source_type: EPageSourceType.Website,
      //     status: EPageStatus.Pending,
      //     crawled_at: new Date().toISOString(),
      //   });
      //   if (insertError) {
      //     console.error("[KnowledgeAPI] Insert page error:", insertError);
      //     return NextResponse.json(
      //       { success: false, message: `Failed to create page: ${insertError.message}` },
      //       { status: 500, headers: corsHeaders }
      //     );
      //   }
      //   // Enqueue discover job for website crawling
      //   const jobId = await addDiscoverJob({
      //     botId,
      //     startUrl: normalizedUrl,
      //     config: {
      //       maxPages: 1, // Single page for manual URL addition
      //       maxDepth: 0,
      //       renderMode: RenderModeEnum.AUTO,
      //     },
      //   });
      //   // Update bot status
      //   if (bot.status !== EBotStatus.Ready) {
      //     await supabase.from("bots").update({ status: EBotStatus.Discovering }).eq("id", botId);
      //   }
      //   return NextResponse.json(
      //     {
      //       success: true,
      //       data: {
      //         pageId,
      //         jobId,
      //         sourceType: EPageSourceType.Website,
      //       },
      //     },
      //     { headers: corsHeaders }
      //   );
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
