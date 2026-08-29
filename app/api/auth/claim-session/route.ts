import { NextResponse } from "next/server";
import { claimPendingAuthSession } from "@/lib/services/auth-bridge.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Missing sessionId" }, { status: 400 });
    }

    const session = await claimPendingAuthSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session expired or not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        access_token: session.accessToken,
        refresh_token: session.refreshToken ?? null,
      },
    });
  } catch (error) {
    console.error("[API ClaimSession] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
