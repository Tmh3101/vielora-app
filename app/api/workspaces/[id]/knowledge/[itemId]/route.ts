import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import {
  deleteWorkspaceKnowledge,
  isWorkspaceKnowledgeLimitError,
  requireWorkspaceMember,
  updateWorkspaceKnowledge,
} from "@/lib/services/workspace-knowledge.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await requireWorkspaceMember(id, user.id);

    const body = await request.json();
    const updates: { title?: string; content?: string; source_type?: string } = {};
    if (typeof body.title === "string" && body.title.trim()) {
      updates.title = body.title.trim();
    }
    if (typeof body.content === "string" && body.content.trim()) {
      updates.content = body.content.trim();
    }
    if (typeof body.source_type === "string" && body.source_type.trim()) {
      updates.source_type = body.source_type.trim();
    }

    const knowledge = await updateWorkspaceKnowledge(createAdminClient(), id, itemId, updates);
    if (!knowledge) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ knowledge });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized workspace access") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isWorkspaceKnowledgeLimitError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update shared knowledge" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await requireWorkspaceMember(id, user.id);

    await deleteWorkspaceKnowledge(createAdminClient(), id, itemId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized workspace access") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to delete shared knowledge" },
      { status: 500 }
    );
  }
}
