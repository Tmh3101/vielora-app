import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { z } from "zod";

const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(48)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await WorkspaceService.getUserWorkspaces(user.id);
    return NextResponse.json({ workspaces });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = createWorkspaceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
    }

    try {
      const workspace = await WorkspaceService.createWorkspace(user.id, {
        name: parseResult.data.name,
        slug: parseResult.data.slug,
      });
      return NextResponse.json({ workspace }, { status: 201 });
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || "Failed to create workspace";
      const isDuplicate =
        errorMessage.toLowerCase().includes("workspaces_slug_key") ||
        errorMessage.toLowerCase().includes("duplicate key");

      if (isDuplicate) {
        const suggestions = await WorkspaceService.getAvailableSlugSuggestions(
          parseResult.data.slug
        );
        return NextResponse.json(
          {
            error: "Workspace slug này đã tồn tại.",
            code: "DUPLICATE_SLUG",
            suggestions,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to create workspace" },
      { status: 500 }
    );
  }
}
