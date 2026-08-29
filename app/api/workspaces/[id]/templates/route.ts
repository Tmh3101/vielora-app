import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, MAX_WORKSPACE_REPORT_TEMPLATES } from "@/lib/constants";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { requireWorkspaceMember } from "@/lib/services/workspace-knowledge.service";
import { isWorkspaceAdmin } from "@/lib/helpers/report-permission";
import { getRegisteredKeys, isRegisteredKey } from "@/lib/reports/data-source-adapter";
import { DEFAULT_REPORT_TEMPLATE_KEY, DEFAULT_REPORT_TEMPLATE_SCHEMA } from "@/config/report";

export const dynamic = "force-dynamic";

const createTemplateSchema = z.object({
  key: z.string().optional().default(DEFAULT_REPORT_TEMPLATE_KEY),
  name: z.string().min(1, "Template name is required"),
  version: z.number().int().positive().optional().default(1),
  prompt_directive: z.string().nullable().optional(),
  schema: z
    .object({
      sections: z.array(z.record(z.unknown())).min(1, "Schema must have at least one section"),
    })
    .passthrough(),
  languages: z.array(z.string()).min(1).optional().default(["vi"]),
  is_active: z.boolean().optional().default(true),
});

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string; wsId?: string }> | { id?: string; wsId?: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const workspaceId = resolvedParams.id || resolvedParams.wsId;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "workspaceId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Session authentication
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. Active workspace member check
    try {
      await requireWorkspaceMember(workspaceId, user.id);
    } catch {
      return NextResponse.json(
        { success: false, message: "Forbidden: You are not an active member of this workspace" },
        { status: 403, headers: corsHeaders }
      );
    }

    const adminClient = createAdminClient();

    // 3. Query report templates
    const searchParams = req.nextUrl.searchParams;
    const includeInactive = searchParams.get("includeInactive") === "true";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (adminClient as any)
      .from("report_templates")
      .select(
        "id, workspace_id, key, name, version, schema, languages, is_active, created_by, created_at, updated_at, prompt_directive"
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: templates, error: dbError } = await query;

    if (dbError) {
      console.error("[WorkspaceTemplatesAPI] GET error:", dbError);
      return NextResponse.json(
        { success: false, message: dbError.message || "Failed to fetch report templates" },
        { status: 500, headers: corsHeaders }
      );
    }

    let finalTemplates = templates || [];
    if (finalTemplates.length === 0 && !includeInactive) {
      // Auto-seed default Bot Summary Report for workspace if none exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: seeded } = await (adminClient as any)
        .from("report_templates")
        .insert({
          workspace_id: workspaceId,
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
    console.error("[WorkspaceTemplatesAPI] GET unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string; wsId?: string }> | { id?: string; wsId?: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const workspaceId = resolvedParams.id || resolvedParams.wsId;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "workspaceId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Session authentication
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. Authorization check: Owner or Admin only (hierarchy >= 80)
    const adminClient = createAdminClient();
    const isAdmin = await isWorkspaceAdmin(adminClient, workspaceId, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Only workspace owners and admins can manage report templates",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 3. Request body validation
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400, headers: corsHeaders }
      );
    }

    const parseResult = createTemplateSchema.safeParse(body);
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

    const payload = parseResult.data;

    // 4. Guard: Unregistered key check
    const availableKeys = getRegisteredKeys();
    if (!isRegisteredKey(payload.key)) {
      return NextResponse.json(
        {
          success: false,
          message: `Template key "${payload.key}" is not registered in the codebase. Please select an available template key.`,
          availableKeys,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 5. Quota check: max 5 active templates per workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: activeCount } = await (adminClient as any)
      .from("report_templates")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (activeCount && activeCount >= MAX_WORKSPACE_REPORT_TEMPLATES) {
      return NextResponse.json(
        {
          success: false,
          message: `Không gian làm việc đã đạt giới hạn tối đa ${MAX_WORKSPACE_REPORT_TEMPLATES} mẫu báo cáo. Vui lòng vô hiệu hoá bớt mẫu không sử dụng để tạo thêm.`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 6. Calculate next version for this workspace + key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: maxRow } = await (adminClient as any)
      .from("report_templates")
      .select("version")
      .eq("workspace_id", workspaceId)
      .eq("key", payload.key)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetVersion = maxRow && typeof maxRow.version === "number" ? maxRow.version + 1 : 1;

    // 7. Insert new template row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insertError } = await (adminClient as any)
      .from("report_templates")
      .insert({
        workspace_id: workspaceId,
        key: payload.key,
        name: payload.name,
        version: targetVersion,
        prompt_directive: payload.prompt_directive || null,
        schema: payload.schema,
        languages: payload.languages,
        is_active: payload.is_active ?? true,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error("[WorkspaceTemplatesAPI] Insert error:", insertError);
      return NextResponse.json(
        { success: false, message: insertError?.message || "Failed to create report template" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: inserted,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[WorkspaceTemplatesAPI] POST unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
