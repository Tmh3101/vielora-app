import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const rawSlug = searchParams.get("slug");

    if (!rawSlug) {
      return NextResponse.json({ available: false, message: "Slug is required" }, { status: 400 });
    }

    const slug = rawSlug.toLowerCase();
    const supabase = await createServerClient();
    const { data, error } = await supabase.from("bots").select("id").eq("slug", slug).maybeSingle();

    if (error) {
      console.error("Error checking slug:", error);
      return NextResponse.json({ available: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ available: !data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check slug";
    return NextResponse.json({ available: false, message }, { status: 500 });
  }
}
