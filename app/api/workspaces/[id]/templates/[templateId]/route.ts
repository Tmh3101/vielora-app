import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders } from "@/lib/constants";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { requireWorkspaceMember } from "@/lib/services/workspace-knowledge.service";
import { isWorkspaceAdmin } from "@/lib/helpers/report-permission";

export const dynamic = "force-dynamic";

const updateTemplateSchema = z.object({
  name: z.string().min(1, "Template name cannot be empty").optional(),
  version: z.number().int().positive().optional(),
  prompt_directive: z.string().nullable().optional(),
  schema: z
    .object({
      sections: z.array(z.record(z.unknown())).min(1, "Schema must have at least one section"),
    })
    .passthrough()
    .optional(),
  languages: z.array(z.string()).min(1).optional(),
  is_active: z.boolean().optional(),
});

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(
  _req: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id?: string; wsId?: string; templateId: string }>
      | { id?: string; wsId?: string; templateId: string };
  }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const workspaceId = resolvedParams.id || resolvedParams.wsId;
    const templateId = resolvedParams.templateId;

    if (!workspaceId || !templateId) {
      return NextResponse.json(
        { success: false, message: "workspaceId and templateId are required" },
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

    // 3. Query report template
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: template, error: dbError } = await (supabase as any)
      .from("report_templates")
      .select("*")
      .eq("id", templateId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (dbError) {
      console.error("[WorkspaceTemplateDetailAPI] GET fetch error:", dbError);
      return NextResponse.json(
        { success: false, message: dbError.message || "Failed to fetch report template" },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Report template not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: template,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[WorkspaceTemplateDetailAPI] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function handleUpdateTemplate(
  req: NextRequest,
  params:
    | Promise<{ id?: string; wsId?: string; templateId: string }>
    | { id?: string; wsId?: string; templateId: string }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const workspaceId = resolvedParams.id || resolvedParams.wsId;
    const templateId = resolvedParams.templateId;

    if (!workspaceId || !templateId) {
      return NextResponse.json(
        { success: false, message: "workspaceId and templateId are required" },
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
          message: "Forbidden: Only workspace owners and admins can edit report templates",
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

    const parseResult = updateTemplateSchema.safeParse(body);
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

    // 4. Verify template exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingTemplate, error: checkError } = await (adminClient as any)
      .from("report_templates")
      .select("id")
      .eq("id", templateId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (checkError || !existingTemplate) {
      return NextResponse.json(
        { success: false, message: "Report template not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // 5. Build update payload
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (payload.name !== undefined) updatePayload.name = payload.name;
    if (payload.version !== undefined) updatePayload.version = payload.version;
    if (payload.prompt_directive !== undefined)
      updatePayload.prompt_directive = payload.prompt_directive;
    if (payload.schema !== undefined) updatePayload.schema = payload.schema;
    if (payload.languages !== undefined) updatePayload.languages = payload.languages;
    if (payload.is_active !== undefined) updatePayload.is_active = payload.is_active;

    // 6. Update template
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedTemplate, error: updateError } = await (adminClient as any)
      .from("report_templates")
      .update(updatePayload)
      .eq("id", templateId)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();

    if (updateError || !updatedTemplate) {
      console.error("[WorkspaceTemplateDetailAPI] Update error:", updateError);
      return NextResponse.json(
        { success: false, message: updateError?.message || "Failed to update report template" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedTemplate,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[WorkspaceTemplateDetailAPI] PUT/PATCH error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id?: string; wsId?: string; templateId: string }>
      | { id?: string; wsId?: string; templateId: string };
  }
) {
  return handleUpdateTemplate(req, params);
}

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id?: string; wsId?: string; templateId: string }>
      | { id?: string; wsId?: string; templateId: string };
  }
) {
  return handleUpdateTemplate(req, params);
}

export async function DELETE(
  _req: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id?: string; wsId?: string; templateId: string }>
      | { id?: string; wsId?: string; templateId: string };
  }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const workspaceId = resolvedParams.id || resolvedParams.wsId;
    const templateId = resolvedParams.templateId;

    if (!workspaceId || !templateId) {
      return NextResponse.json(
        { success: false, message: "workspaceId and templateId are required" },
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
          message: "Forbidden: Only workspace owners and admins can delete report templates",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 3. Verify template exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingTemplate, error: checkError } = await (adminClient as any)
      .from("report_templates")
      .select("id")
      .eq("id", templateId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (checkError || !existingTemplate) {
      return NextResponse.json(
        { success: false, message: "Report template not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // 3.5 Check active templates count (must keep at least 1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: activeCount } = await (adminClient as any)
      .from("report_templates")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (activeCount !== null && activeCount <= 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể vô hiệu hoá mẫu báo cáo cuối cùng. Không gian làm việc phải duy trì ít nhất 1 mẫu báo cáo hoạt động.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. Soft-delete: set is_active = false (do NOT hard delete)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: softDeleted, error: deleteError } = await (adminClient as any)
      .from("report_templates")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId)
      .eq("workspace_id", workspaceId)
      .select("id, is_active, updated_at")
      .single();

    if (deleteError) {
      console.error("[WorkspaceTemplateDetailAPI] Soft-delete error:", deleteError);
      return NextResponse.json(
        { success: false, message: deleteError.message || "Failed to deactivate report template" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Template deactivated successfully",
        data: softDeleted,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[WorkspaceTemplateDetailAPI] DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
