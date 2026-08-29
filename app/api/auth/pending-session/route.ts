import { NextResponse } from "next/server";
import { storePendingAuthSession } from "@/lib/services/auth-bridge.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, accessToken, refreshToken } = body;

    if (!sessionId || !accessToken) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const success = await storePendingAuthSession(sessionId, accessToken, refreshToken);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to store session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API PendingSession] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
