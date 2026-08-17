import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { formatVoiceNote } from "@/lib/ai/stt";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabaseUserClient = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseUserClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: "Thiếu nội dung văn bản để định dạng." },
        { status: 400 }
      );
    }

    const result = await formatVoiceNote(text.trim());

    return NextResponse.json({
      success: true,
      title: result.title,
      contentHtml: result.contentHtml,
    });
  } catch (error) {
    console.error("Unhandled Voice Note Format Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi định dạng ghi chú";
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
