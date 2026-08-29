import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { corsHeaders } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyDownloadToken } from "@/lib/helpers/report-token";
import { REPORT_EXPORTS_BUCKET } from "@/lib/services/report-export.service";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ exportId: string }> | { exportId: string } }
) {
  try {
    const { exportId } = await Promise.resolve(params);

    if (!exportId) {
      return NextResponse.json(
        { success: false, message: "Missing exportId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Verify signed HMAC download token from query string
    const token = req.nextUrl.searchParams.get("token");
    const requestedLang = req.nextUrl.searchParams.get("lang");
    const format = req.nextUrl.searchParams.get("format");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Missing download token" },
        { status: 401, headers: corsHeaders }
      );
    }

    const tokenPayload = verifyDownloadToken(token);
    if (!tokenPayload || tokenPayload.exportId !== exportId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid or expired download token" },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. Fetch export record
    const adminClient = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exportRow, error: fetchError } = await (adminClient as any)
      .from("report_exports")
      .select(
        "id, status, file_path, template_id, workspace_id, scope, report_templates(key, name)"
      )
      .eq("id", exportId)
      .maybeSingle();

    if (fetchError || !exportRow) {
      return NextResponse.json(
        { success: false, message: "Report export not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (exportRow.status !== "issued" && exportRow.status !== "approved") {
      return NextResponse.json(
        {
          success: false,
          message: `Report has not been issued yet (current status: ${exportRow.status})`,
        },
        { status: 403, headers: corsHeaders }
      );
    }

    const templateName = Array.isArray(exportRow.report_templates)
      ? exportRow.report_templates[0]?.name || exportRow.report_templates[0]?.key
      : exportRow.report_templates?.name || exportRow.report_templates?.key || "Report";

    const cleanTitle = (templateName || "Report")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_");

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const scopeObj = (exportRow.scope as Record<string, unknown>) || {};
    const filesList =
      (scopeObj as { files?: Array<{ lang: string; path: string; filename: string }> })?.files ||
      [];

    // 3. Handle ZIP download format (combines all languages into one zip)
    if (format === "zip" && filesList.length > 0) {
      const zip = new JSZip();

      await Promise.all(
        filesList.map(async (fileItem) => {
          try {
            const { data: blob } = await adminClient.storage
              .from(REPORT_EXPORTS_BUCKET)
              .download(fileItem.path);

            if (blob) {
              const buffer = await blob.arrayBuffer();
              zip.file(fileItem.filename, buffer);
            }
          } catch (err) {
            console.error(`[ReportDownload] Error adding ${fileItem.filename} to zip:`, err);
          }
        })
      );

      const zipContent = await zip.generateAsync({ type: "nodebuffer" });
      const zipFilename = `${cleanTitle}_${dateStr}_${exportId.slice(0, 8)}.zip`;

      return new NextResponse(zipContent, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${zipFilename}"`,
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    }

    // 4. Handle single PDF file download (specific language or default)
    let targetFilePath = exportRow.file_path;
    let targetFilename = `${cleanTitle}_${dateStr}_${exportId.slice(0, 8)}.pdf`;

    if (requestedLang && filesList.length > 0) {
      const matched = filesList.find((f) => f.lang === requestedLang);
      if (matched) {
        targetFilePath = matched.path;
        targetFilename = matched.filename;
      }
    }

    if (!targetFilePath) {
      return NextResponse.json(
        { success: false, message: "Report PDF file not available" },
        { status: 404, headers: corsHeaders }
      );
    }

    const { data: fileBlob, error: downloadError } = await adminClient.storage
      .from(REPORT_EXPORTS_BUCKET)
      .download(targetFilePath);

    if (downloadError || !fileBlob) {
      console.error(`[ReportDownload][${exportId}] Storage download error:`, downloadError);
      return NextResponse.json(
        { success: false, message: "Failed to download report PDF from storage" },
        { status: 500, headers: corsHeaders }
      );
    }

    const encodedUtf8Filename = encodeURIComponent(targetFilename);
    const contentDisposition = `attachment; filename="${targetFilename}"; filename*=UTF-8''${encodedUtf8Filename}`;
    const arrayBuffer = await fileBlob.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[ReportDownload] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
