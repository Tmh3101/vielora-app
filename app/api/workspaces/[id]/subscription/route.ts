import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { getWorkspaceSubscriptionPlan } from "@/lib/services/subscription.service";
import { WorkspaceService } from "@/lib/services/workspace.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: workspaceId } = await params;
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "workspaceId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    try {
      await WorkspaceService.getWorkspaceById(workspaceId, user.id);
    } catch {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403, headers: corsHeaders }
      );
    }

    const plan = await getWorkspaceSubscriptionPlan(supabase, workspaceId);
    return NextResponse.json({ success: true, data: plan }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching workspace subscription:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
