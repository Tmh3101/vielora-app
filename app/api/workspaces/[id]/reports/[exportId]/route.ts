import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { authenticateRequest, resolveWorkspaceId } from "@/lib/helpers/workspace-route-helpers";
import { requireWorkspaceMember } from "@/lib/services/workspace-knowledge.service";
import { signDownloadToken } from "@/lib/helpers/report-token";
import { REPORT_EXPORTS_BUCKET } from "@/config/storage";
import { EReportExportStatus } from "@/config/report";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(
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

    // 2. Active workspace member check
    try {
      await requireWorkspaceMember(wsId, user.id);
    } catch {
      return NextResponse.json(
        { success: false, message: "Forbidden: You are not an active member of this workspace" },
        { status: 403, headers: corsHeaders }
      );
    }

    // 3. Fetch export row with template and bot info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exportRow, error: fetchError } = await (adminClient as any)
      .from("report_exports")
      .select("*, report_templates(id, key, name), bots(id, name)")
      .eq("id", exportId)
      .eq("workspace_id", wsId)
      .maybeSingle();

    if (fetchError || !exportRow) {
      return NextResponse.json(
        { success: false, message: "Report export not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // 4. Generate signed downloadUrl and per-language file download URLs if status is 'issued'
    let downloadUrl: string | null = null;
    let zipDownloadUrl: string | null = null;
    let files: Array<{ lang: string; filename: string; downloadUrl: string }> = [];

    if (
      exportRow.status === EReportExportStatus.Issued ||
      exportRow.status === EReportExportStatus.Approved
    ) {
      try {
        const token = signDownloadToken(exportId);
        downloadUrl = `/api/reports/${exportId}/download?token=${token}`;

        const scopeObj = (exportRow.scope as Record<string, unknown>) || {};
        const rawFiles =
          (
            scopeObj as {
              files?: Array<{ lang: string; path: string; filename: string }>;
            }
          )?.files || [];

        if (rawFiles.length > 0) {
          files = rawFiles.map((f) => ({
            lang: f.lang,
            filename: f.filename,
            downloadUrl: `/api/reports/${exportId}/download?token=${token}&lang=${f.lang}`,
          }));

          if (rawFiles.length > 1) {
            zipDownloadUrl = `/api/reports/${exportId}/download?token=${token}&format=zip`;
          }
        }
      } catch (tokenErr) {
        console.error(
          `[ReportExportStatus] Failed to sign download token for ${exportId}:`,
          tokenErr
        );
      }
    }

    // 5. Generate short-lived signed previewUrl (1 hour) if PDF file_path exists in private storage
    let previewUrl: string | null = null;
    if (exportRow.file_path) {
      try {
        const { data: signedData, error: signError } = await adminClient.storage
          .from(REPORT_EXPORTS_BUCKET)
          .createSignedUrl(exportRow.file_path, 3600);

        if (signError) {
          console.error(
            `[ReportExportStatus] Storage createSignedUrl error for ${exportId}:`,
            signError
          );
        } else if (signedData?.signedUrl) {
          previewUrl = signedData.signedUrl;
        }
      } catch (signErr) {
        console.error(
          `[ReportExportStatus] Error creating signed preview URL for ${exportId}:`,
          signErr
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...exportRow,
          downloadUrl,
          zipDownloadUrl,
          files,
          previewUrl,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[ReportExportStatus] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
