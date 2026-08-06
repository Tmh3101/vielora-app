import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { createBot } from "@/lib/services/bot.service";
import { requireWorkspacePermission } from "@/lib/services/workspace-knowledge.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    let user = null;

    // 1. Try cookie-based session auth
    const serverSupabase = await createServerClient();
    const { data: userData } = await serverSupabase.auth.getUser();

    if (userData?.user) {
      user = userData.user;
    } else {
      // 2. Try Bearer token header auth
      const authResult = await authenticateRequest(req);
      if (!isAuthError(authResult)) {
        user = authResult.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { name, domain, avatarUrl, crawlSettings, workspaceId: bodyWorkspaceId } = body;

    if (!name || !domain) {
      return NextResponse.json(
        { success: false, message: "Tên bot và Domain là bắt buộc" },
        { status: 400, headers: corsHeaders }
      );
    }

    const cookieStore = await cookies();
    const activeWorkspaceId =
      bodyWorkspaceId ||
      req.headers.get("x-workspace-id") ||
      cookieStore.get("active_workspace_id")?.value;

    if (!activeWorkspaceId) {
      return NextResponse.json(
        { success: false, message: "Workspace is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify user has bot_create permission in this workspace
    await requireWorkspacePermission(activeWorkspaceId, user.id, "bot_create");

    const bot = await createBot(serverSupabase, {
      userId: user.id,
      workspaceId: activeWorkspaceId,
      name,
      domain,
      avatarUrl,
      crawlSettings,
    });

    return NextResponse.json({ success: true, data: bot }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("Error creating bot in API:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status =
      msg === "Unauthorized workspace access" || msg.includes("Insufficient permissions")
        ? 403
        : 500;
    return NextResponse.json({ success: false, message: msg }, { status, headers: corsHeaders });
  }
}
