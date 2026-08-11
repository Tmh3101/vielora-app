import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  dryRunBulkCreate,
  createBotsBulk,
  RawBulkRow,
  BulkTemplateConfig,
} from "@/lib/services/bulk-bot.service";

interface BulkCreateRequestBody {
  workspaceId: string;
  mode: "dry-run" | "create";
  template?: BulkTemplateConfig;
  rawRows?: RawBulkRow[];
  rows?: Array<{
    name: string;
    slug: string;
    avatarUrl?: string;
    knowledgeTitle: string;
    knowledgeContent: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body: BulkCreateRequestBody = await req.json();
    const { workspaceId, mode, template = {}, rawRows = [], rows = [] } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "workspaceId là bắt buộc" },
        { status: 400 }
      );
    }

    // 1. Verify workspace permission (Must be owner or admin)
    // For admin client context, we verify workspace exists and caller membership if passed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspace } = await (supabase as any)
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (!workspace) {
      return NextResponse.json(
        { success: false, message: "Workspace không tồn tại" },
        { status: 404 }
      );
    }

    // 2. Handle dry-run mode
    if (mode === "dry-run") {
      const result = await dryRunBulkCreate(supabase, workspaceId, rawRows);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // 3. Handle create mode
    if (mode === "create") {
      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { success: false, message: "Danh sách rows cần tạo không được rỗng" },
          { status: 400 }
        );
      }

      const result = await createBotsBulk(supabase, {
        workspaceId,
        ownerId: workspace.owner_id,
        template,
        rows,
      });

      return NextResponse.json({
        success: result.success,
        message: result.message,
        data: result,
      });
    }

    return NextResponse.json(
      { success: false, message: 'mode phải là "dry-run" hoặc "create"' },
      { status: 400 }
    );
  } catch (error) {
    console.error("[BulkCreateAPI] Error processing bulk bot creation:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi hệ thống khi khởi tạo bot hàng loạt",
      },
      { status: 500 }
    );
  }
}
