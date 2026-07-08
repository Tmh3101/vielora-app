import { NextResponse, NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { clearBotSelectionFlagServer } from "@/lib/services/subscription.service";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    const { subscriptionId } = await request.json();
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
