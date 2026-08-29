import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, API_RATE_LIMITS } from "@/lib/constants";
import { authenticateRequest, resolveWorkspaceId } from "@/lib/helpers/workspace-route-helpers";
import { checkApiRateLimit, createRateLimitHeaders } from "@/lib/security/api-rate-limiter";
import { canExportReport } from "@/lib/helpers/report-permission";
import { getWorkspaceSubscriptionPlan } from "@/lib/services/subscription.service";
import { ESubscriptionPlan } from "@/types";
import { CREDIT_PER_REPORT } from "@/config/credit";
import {
  MAX_REPORT_TITLE_LENGTH,
  MAX_REPORT_CUSTOM_INSTRUCTIONS_LENGTH,
  PLAN_UPGRADE_REQUIRED,
  INSUFFICIENT_CREDITS,
  DEFAULT_REPORT_TEMPLATE_KEY,
} from "@/config/report";

export const dynamic = "force-dynamic";

const triggerReportSchema = z.object({
  templateId: z.string().uuid().optional(),
  templateKey: z.string().optional().default(DEFAULT_REPORT_TEMPLATE_KEY),
  scope: z
    .object({
      reportTitle: z.string().max(MAX_REPORT_TITLE_LENGTH).optional(),
      customInstructions: z.string().max(MAX_REPORT_CUSTOM_INSTRUCTIONS_LENGTH).optional(),
      languages: z.array(z.string().min(2).max(10)).min(1).max(10).optional(),
      groupId: z.string().uuid().optional(),
      requestedByDisplayName: z.string().optional(),
    })
    .passthrough()
    .optional()
    .default({}),
  language: z.string().optional().default("vi"),
});

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; botId: string }> | { id: string; botId: string } }
) {
  try {
    const { id: rawWsId, botId } = await Promise.resolve(params);

    if (!rawWsId || !botId) {
      return NextResponse.json(
        { success: false, message: "workspaceId and botId are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Session authentication
    const auth = await authenticateRequest();
    if (!auth.authenticated) return auth.response;
    const { user, adminClient } = auth;

    let wsId = rawWsId;

    // Resolve slug to UUID if needed
    wsId = await resolveWorkspaceId(adminClient, rawWsId);

    // 2. Rate limit check (REPORT_EXPORT per workspace)
    const rateLimitResult = checkApiRateLimit(
      `report_export:${wsId}`,
      API_RATE_LIMITS.REPORT_EXPORT
    );

    if (!rateLimitResult.allowed) {
      const headers = {
        ...corsHeaders,
        ...createRateLimitHeaders(
          rateLimitResult.remaining,
          rateLimitResult.resetIn,
          API_RATE_LIMITS.REPORT_EXPORT.maxRequests
        ),
      };
      return NextResponse.json(
        {
          success: false,
          message:
            API_RATE_LIMITS.REPORT_EXPORT.message ||
            "You are requesting report exports too quickly. Please wait a moment.",
        },
        { status: 429, headers }
      );
    }

    // 3. 3-tier permission check
    const hasPermission = await canExportReport(adminClient, wsId, botId, user.id);
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: You do not have permission to export reports for this bot",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 4. Plan Gating: Pro and Enterprise ONLY
    const ALLOWED_REPORT_PLANS = [ESubscriptionPlan.Pro, ESubscriptionPlan.Enterprise];
    const wsSub = await getWorkspaceSubscriptionPlan(adminClient, wsId);
    const currentPlan = wsSub?.planCode ?? ESubscriptionPlan.Free;

    if (!ALLOWED_REPORT_PLANS.includes(currentPlan)) {
      return NextResponse.json(
        {
          success: false,
          code: PLAN_UPGRADE_REQUIRED,
          message:
            "Tính năng xuất báo cáo chỉ khả dụng cho gói Pro và Enterprise. Vui lòng nâng cấp gói để sử dụng.",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 4. Request body validation with Zod
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400, headers: corsHeaders }
      );
    }

    const parseResult = triggerReportSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { templateId, templateKey, scope, language } = parseResult.data;

    // 5. Resolve template from report_templates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let templateQuery = (adminClient as any)
      .from("report_templates")
      .select("id, key, is_active, schema, languages")
      .eq("workspace_id", wsId);

    if (templateId) {
      templateQuery = templateQuery.eq("id", templateId);
    } else {
      templateQuery = templateQuery
        .eq("key", templateKey)
        .eq("is_active", true)
        .order("version", { ascending: false });
    }

    const { data: template, error: templateError } = await templateQuery.limit(1).maybeSingle();

    if (templateError || !template) {
      return NextResponse.json(
        {
          success: false,
          message: `Report template not found in this workspace`,
        },
        { status: 404, headers: corsHeaders }
      );
    }

    const resolvedTemplateKey = template.key || templateKey;

    // 6. Calculate required credits based on target language count (10 credits / file)
    const targetLanguages =
      Array.isArray(scope?.languages) && scope.languages.length > 0
        ? (scope.languages as string[])
        : [language || "vi"];
    const fileCount = targetLanguages.length;
    const totalCost = fileCount * CREDIT_PER_REPORT;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: wallet, error: walletError } = await (adminClient as any)
      .from("wallets")
      .select("subscription_credits, payg_credits")
      .eq("workspace_id", wsId)
      .maybeSingle();

    if (walletError) {
      console.error("[ReportExportTrigger] Wallet query error:", walletError);
    }

    const totalCredits = (wallet?.subscription_credits ?? 0) + (wallet?.payg_credits ?? 0);
    if (totalCredits < totalCost) {
      return NextResponse.json(
        {
          success: false,
          code: INSUFFICIENT_CREDITS,
          message: `Không đủ credits trong workspace. Yêu cầu: ${totalCost} credits (${fileCount} file x ${CREDIT_PER_REPORT} credits), khả dụng: ${totalCredits}`,
        },
        { status: 402, headers: corsHeaders }
      );
    }

    // 7. Dynamic import of enqueueReportExport to avoid bundling BullMQ into route chunk
    const { enqueueReportExport } = await import("@/lib/jobs/report-export-enqueue");

    const exportRecord = await enqueueReportExport(adminClient, {
      workspaceId: wsId,
      botId,
      templateId: template.id,
      templateKey: resolvedTemplateKey,
      requestedBy: user.id,
      language,
      scope: {
        ...scope,
        languages: targetLanguages,
        fileCount,
        totalCreditCost: totalCost,
      },
    });

    // 8. Return 202 Accepted with exportId
    return NextResponse.json(
      {
        success: true,
        exportId: exportRecord.id,
      },
      { status: 202, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[ReportExportTrigger] Unexpected error:", error);

    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isCreditError = errorMessage.toLowerCase().includes("insufficient");

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        ...(isCreditError ? { code: "INSUFFICIENT_CREDITS" } : {}),
      },
      {
        status: isCreditError ? 402 : 500,
        headers: corsHeaders,
      }
    );
  }
}
