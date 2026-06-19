import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const { subject, message } = (await request.json()) as { subject: string; message: string };
    if (!subject || !message) {
      return NextResponse.json({ error: "Missing subject or message" }, { status: 400 });
    }

    if (subject.trim().length === 0 || message.trim().length === 0) {
      return NextResponse.json({ error: "Subject and message cannot be empty" }, { status: 400 });
    }

    const { data: ticket, error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
        status: "open",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Support ticket insertion error:", insertError);
      return NextResponse.json({ error: "Failed to create support ticket" }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("Support API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
