import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders } from "@/lib/constants";
import { authenticateRequest, resolveWorkspaceId } from "@/lib/helpers/workspace-route-helpers";
import { isWorkspaceAdmin } from "@/lib/helpers/report-permission";
import { signDownloadToken } from "@/lib/helpers/report-token";
import { EReviewAction, EReportExportStatus } from "@/config/report";

export const dynamic = "force-dynamic";

const reviewReportSchema = z.object({
  action: z.nativeEnum(EReviewAction),
  notes: z.string().optional(),
});

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; exportId: string }> | { id: string; exportId: string } }
) {
  try {
    const { id: rawWsId, exportId } = await Promise.resolve(params);

    if (!rawWsId || !exportId) {
      return NextResponse.json(
        { success: false, message: "workspaceId and exportId are required" },
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

    // 2. Authorization check: Owner or Admin only (hierarchy >= 80)
    const isAdmin = await isWorkspaceAdmin(adminClient, wsId, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Only workspace owners and admins can review report exports",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 3. Request body validation with Zod
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400, headers: corsHeaders }
      );
    }

    const parseResult = reviewReportSchema.safeParse(body);
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

    const { action, notes } = parseResult.data;

    // 4. Fetch export row from database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exportRow, error: fetchError } = await (adminClient as any)
      .from("report_exports")
      .select("*")
      .eq("id", exportId)
      .eq("workspace_id", wsId)
      .maybeSingle();

    if (fetchError || !exportRow) {
      return NextResponse.json(
        { success: false, message: "Report export not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // 5. Validate status is awaiting_review
    if (exportRow.status !== EReportExportStatus.AwaitingReview) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot review report in status '${exportRow.status}'. Expected status is '${EReportExportStatus.AwaitingReview}'.`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 6. Update status based on action
    // MVP: review route sets status = 'issued' directly on approve (skipping separate worker approved->issued step)
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status:
        action === EReviewAction.Approve ? EReportExportStatus.Issued : EReportExportStatus.Failed,
      reviewed_by: user.id,
      reviewed_at: now,
    };

    if (action === EReviewAction.Reject) {
      updatePayload.error_message = notes || "Rejected by reviewer";
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedRow, error: updateError } = await (adminClient as any)
      .from("report_exports")
      .update(updatePayload)
      .eq("id", exportId)
      .select("*")
      .single();

    if (updateError || !updatedRow) {
      console.error("[ReportExportReview] Update error:", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to update review status" },
        { status: 500, headers: corsHeaders }
      );
    }

    let downloadUrl: string | null = null;
    if (updatedRow.status === EReportExportStatus.Issued) {
      try {
        const token = signDownloadToken(exportId);
        downloadUrl = `/api/reports/${exportId}/download?token=${token}`;
      } catch (tokenErr) {
        console.error(`[ReportExportReview] Failed to generate download token:`, tokenErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...updatedRow,
          downloadUrl,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[ReportExportReview] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
