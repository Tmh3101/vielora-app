import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { authenticateRequest, resolveWorkspaceId } from "@/lib/helpers/workspace-route-helpers";
import { canExportReport } from "@/lib/helpers/report-permission";
import { DEFAULT_REPORT_TEMPLATE_KEY, DEFAULT_REPORT_TEMPLATE_SCHEMA } from "@/config/report";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(
  _req: NextRequest,
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

    // Resolve slug to UUID if needed
    const wsId = await resolveWorkspaceId(adminClient, rawWsId);

    // 2. 3-tier permission check (same as report export):
    //    Tier 1: Owner/Admin (hierarchy >= 80)
    //    Tier 2: Workspace role with permissions.reports === true
    //    Tier 3: Group member with can_export_report = true for a group connected to this bot
    const hasPermission = await canExportReport(adminClient, wsId, botId, user.id);
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: You do not have permission to view report templates for this bot",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 3. Query report_templates for this workspace that are active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: templates, error: dbError } = await (adminClient as any)
      .from("report_templates")
      .select(
        "id, workspace_id, key, name, version, schema, languages, is_active, created_at, updated_at"
      )
      .eq("workspace_id", wsId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (dbError) {
      console.error("[WorkspaceBotTemplatesAPI] GET fetch error:", dbError);
      return NextResponse.json(
        { success: false, message: dbError.message || "Failed to fetch report templates" },
        { status: 500, headers: corsHeaders }
      );
    }

    let finalTemplates = templates || [];
    if (finalTemplates.length === 0) {
      // Auto-seed default Bot Summary Report for workspace if none exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: seeded } = await (adminClient as any)
        .from("report_templates")
        .insert({
          workspace_id: wsId,
          key: DEFAULT_REPORT_TEMPLATE_KEY,
          name: DEFAULT_REPORT_TEMPLATE_SCHEMA.title,
          version: 1,
          schema: DEFAULT_REPORT_TEMPLATE_SCHEMA,
          languages: ["vi"],
          is_active: true,
          created_by: user.id,
        })
        .select("*")
        .single();

      if (seeded) {
        finalTemplates = [seeded];
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: finalTemplates,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[WorkspaceBotTemplatesAPI] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
