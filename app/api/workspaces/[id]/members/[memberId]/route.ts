import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspaceService } from "@/lib/services/workspace.service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await WorkspaceService.removeMember(id, memberId, user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to remove member" },
      { status: 500 }
    );
  }
}
