import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { clearBotSelectionFlagServer } from "@/lib/services/subscription.service";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    let user = null;

    // 1. Try cookie-based session auth first
    const serverSupabase = await createServerClient();
    const { data: userData } = await serverSupabase.auth.getUser();

    if (userData?.user) {
      user = userData.user;
    } else {
      // 2. Fallback to Bearer token header auth
      const authResult = await authenticateRequest(request);
      if (!isAuthError(authResult)) {
        user = authResult.user;
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

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
