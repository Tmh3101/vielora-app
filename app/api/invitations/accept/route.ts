import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspaceService } from "@/lib/services/workspace.service";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await WorkspaceService.acceptInvitation(token, user.id);
    return NextResponse.json({ workspace });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to accept invitation" },
      { status: 400 }
    );
  }
}
