import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { clearBotSelectionFlagServer } from "@/lib/services/subscription.service";

export async function POST(request: Request) {
  try {
    const supabaseUserClient = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseUserClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    await clearBotSelectionFlagServer(adminClient, subscriptionId, user.id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[ClearBotSelection API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
