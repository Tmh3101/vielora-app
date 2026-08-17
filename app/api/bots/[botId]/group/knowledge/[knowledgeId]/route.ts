import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { isBotManager } from "@/lib/services/group-permission.service";
import { unpinKnowledge } from "@/lib/services/group-chat.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string; knowledgeId: string }> }
) {
  try {
    const { botId, knowledgeId } = await params;
    if (!botId || !knowledgeId) {
      return NextResponse.json(
        { success: false, message: "botId and knowledgeId are required" },
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
        { success: false, message: "Unauthenticated" },
        { status: 401, headers: corsHeaders }
      );
    }

    const isManager = await isBotManager(supabase, botId, user.id);
    if (!isManager) {
      // Check member with can_pin_knowledge
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: member } = await (supabase as any)
        .from("group_members")
        .select("can_pin_knowledge")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member || !member.can_pin_knowledge) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    await unpinKnowledge(supabase, knowledgeId, botId);
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  } catch (error) {
    console.error("Error unpinning knowledge:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
