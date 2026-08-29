import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isWorkspaceAdmin } from "@/lib/helpers/report-permission";
import {
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_SIZE,
  WORKSPACE_BRANDING_BUCKET,
} from "@/config/storage";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
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
          message: "Forbidden: Only workspace owners and admins can upload branding assets",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 3. Parse and validate upload FormData
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { success: false, message: "Invalid form data" },
        { status: 400, headers: corsHeaders }
      );
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. Validate MIME type
    if (!(ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Định dạng file không hỗ trợ. Vui lòng chọn ảnh JPEG, PNG, WEBP hoặc SVG.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 5. Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      return NextResponse.json(
        { success: false, message: "Kích thước file vượt quá giới hạn 2MB." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 6. Ensure bucket exists
    const { data: buckets } = await adminClient.storage.listBuckets();
    const brandingBucket = buckets?.find((b) => b.name === WORKSPACE_BRANDING_BUCKET);
    if (!brandingBucket) {
      await adminClient.storage.createBucket(WORKSPACE_BRANDING_BUCKET, {
        public: true,
        fileSizeLimit: MAX_LOGO_SIZE,
        allowedMimeTypes: [...ALLOWED_LOGO_MIME_TYPES],
      });
    }

    // 7. Remove previous files for this workspace
    const { data: existingFiles } = await adminClient.storage
      .from(WORKSPACE_BRANDING_BUCKET)
      .list(workspaceId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${workspaceId}/${f.name}`);
      await adminClient.storage.from(WORKSPACE_BRANDING_BUCKET).remove(filesToDelete);
    }

    // 8. Upload new file using admin storage
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${workspaceId}/logo-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from(WORKSPACE_BRANDING_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type || "image/png",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError || !uploadData) {
      console.error("[branding/upload] Storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, message: uploadError?.message || "Failed to upload file to storage" },
        { status: 500, headers: corsHeaders }
      );
    }

    const {
      data: { publicUrl },
    } = adminClient.storage.from(WORKSPACE_BRANDING_BUCKET).getPublicUrl(uploadData.path);

    return NextResponse.json(
      {
        success: true,
        url: publicUrl,
        path: uploadData.path,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[branding/upload] Uncaught error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
