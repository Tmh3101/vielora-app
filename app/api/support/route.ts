import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { ServiceClient } from "@/lib/services/types";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createServerClient();
    const dbClient: ServiceClient = supabase;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { subject, message } = body as { subject: string; message: string };

    if (!subject || !message) {
      return NextResponse.json({ error: "Missing subject or message" }, { status: 400 });
    }

    if (subject.trim().length === 0 || message.trim().length === 0) {
      return NextResponse.json({ error: "Subject and message cannot be empty" }, { status: 400 });
    }

    // 3. Insert ticket into DB
    const { data: ticket, error: insertError } = await dbClient
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
