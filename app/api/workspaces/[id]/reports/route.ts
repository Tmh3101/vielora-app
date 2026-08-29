import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { authenticateRequest, resolveWorkspaceId } from "@/lib/helpers/workspace-route-helpers";
import { requireWorkspaceMember } from "@/lib/services/workspace-knowledge.service";
import { signDownloadToken } from "@/lib/helpers/report-token";
import { EReportExportStatus } from "@/config/report";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string; wsId?: string }> | { id?: string; wsId?: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawWsId = resolvedParams.id || resolvedParams.wsId;

    if (!rawWsId) {
      return NextResponse.json(
        { success: false, message: "workspaceId is required" },
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

    // 2. Workspace membership check (active member)
    try {
      await requireWorkspaceMember(wsId, user.id);
    } catch {
      return NextResponse.json(
        { success: false, message: "Forbidden: You are not an active member of this workspace" },
        { status: 403, headers: corsHeaders }
      );
    }

    // 3. Parse query filters & pagination
    const searchParams = req.nextUrl.searchParams;
    const botId = searchParams.get("botId");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || searchParams.get("pageSize") || "20", 10) || 20
      )
    );
    const offset = (page - 1) * limit;

    // 4. Query report_exports with adminClient (post-authorization)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (adminClient as any)
      .from("report_exports")
      .select("*, report_templates(id, key, name), bots(id, name)", { count: "exact" })
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (botId) {
      query = query.eq("bot_id", botId);
    }
    if (status && status !== "all") {
      if (status === EReportExportStatus.Pending) {
        query = query.in("status", [EReportExportStatus.Pending, EReportExportStatus.Rendering]);
      } else {
        query = query.eq("status", status);
      }
    }

    const { data: reports, count, error: dbError } = await query;

    if (dbError) {
      console.error("[ReportExportList] Database query error:", dbError);
      return NextResponse.json(
        { success: false, message: dbError.message || "Failed to query report exports" },
        { status: 500, headers: corsHeaders }
      );
    }

    const total = count ?? (reports ? reports.length : 0);

    const reportsWithUrls = (reports || []).map((r) => {
      let downloadUrl: string | null = null;
      if (r.status === EReportExportStatus.Issued) {
        try {
          const token = signDownloadToken(r.id);
          downloadUrl = `/api/reports/${r.id}/download?token=${token}`;
        } catch (tokenErr) {
          console.error(`[ReportExportList] Failed to sign token for report ${r.id}:`, tokenErr);
        }
      }
      return {
        ...r,
        downloadUrl,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: reportsWithUrls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[ReportExportList] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
