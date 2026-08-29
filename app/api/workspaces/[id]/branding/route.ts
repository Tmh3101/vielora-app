import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders } from "@/lib/constants";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { requireWorkspaceMember } from "@/lib/services/workspace-knowledge.service";
import { isWorkspaceAdmin } from "@/lib/helpers/report-permission";

export const dynamic = "force-dynamic";

const brandingUpsertSchema = z.object({
  brand_name: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  primary_color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Mã màu hex không hợp lệ")
    .optional()
    .or(z.literal(""))
    .nullable(),
  secondary_color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Mã màu hex không hợp lệ")
    .nullable()
    .optional()
    .or(z.literal("")),
  font_family: z.string().nullable().optional(),
  header_text: z.string().nullable().optional(),
  footer_text: z.string().nullable().optional(),
  watermark_url: z.string().nullable().optional(),
  default_language: z.enum(["vi", "en", "ar"]).optional(),
  supported_languages: z
    .array(z.enum(["vi", "en", "ar"]))
    .min(1)
    .optional(),
});

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(
  _req: NextRequest,
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

    // 3. Fetch workspace_branding
    const adminClient = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: branding, error: fetchError } = await (adminClient as any)
      .from("workspace_branding")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (fetchError) {
      console.error("[WorkspaceBrandingAPI] GET fetch error:", fetchError);
      return NextResponse.json(
        { success: false, message: fetchError.message || "Failed to fetch branding" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: branding ?? null,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[WorkspaceBrandingAPI] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function handleSaveBranding(
  req: NextRequest,
  params: Promise<{ id?: string; wsId?: string }> | { id?: string; wsId?: string }
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
          message: "Forbidden: Only workspace owners and admins can configure branding",
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

    const parseResult = brandingUpsertSchema.safeParse(body);
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

    // 4. Upsert workspace_branding row (INSERT ... ON CONFLICT (workspace_id) DO UPDATE)
    const primaryColor = payload.primary_color ? payload.primary_color.trim() : "#3B82F6";
    const secondaryColor = payload.secondary_color ? payload.secondary_color.trim() : null;

    const upsertPayload = {
      workspace_id: workspaceId,
      brand_name: payload.brand_name ?? null,
      logo_url: payload.logo_url ?? null,
      primary_color: primaryColor || "#3B82F6",
      secondary_color: secondaryColor,
      font_family: payload.font_family ?? null,
      header_text: payload.header_text ?? null,
      footer_text: payload.footer_text ?? null,
      watermark_url: payload.watermark_url ?? null,
      default_language: payload.default_language || "vi",
      supported_languages:
        payload.supported_languages && payload.supported_languages.length > 0
          ? payload.supported_languages
          : ["vi"],
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: upsertedRow, error: upsertError } = await (adminClient as any)
      .from("workspace_branding")
      .upsert(upsertPayload, { onConflict: "workspace_id" })
      .select("*")
      .single();

    if (upsertError || !upsertedRow) {
      console.error("[WorkspaceBrandingAPI] Upsert error:", upsertError);
      return NextResponse.json(
        { success: false, message: upsertError?.message || "Failed to update branding" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: upsertedRow,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[WorkspaceBrandingAPI] PUT/PATCH error:", error);
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
  { params }: { params: Promise<{ id?: string; wsId?: string }> | { id?: string; wsId?: string } }
) {
  return handleSaveBranding(req, params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string; wsId?: string }> | { id?: string; wsId?: string } }
) {
  return handleSaveBranding(req, params);
}
