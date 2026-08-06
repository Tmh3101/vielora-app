import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { WebhookService } from "@/lib/services/webhook.service";
import { z } from "zod";
import { requireWorkspacePermission } from "@/lib/services/workspace-knowledge.service";

const registerWebhookSchema = z.object({
  workspaceId: z.string().uuid(),
  url: z.string().url("Must be a valid HTTP or HTTPS URL"),
  events: z.array(z.string()).min(1, "Select at least one event type"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId parameter" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require settings permission (covers webhook management)
    await requireWorkspacePermission(workspaceId, user.id, "settings");

    const webhooks = await WebhookService.listWebhooks(workspaceId);
    return NextResponse.json({ webhooks });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const status =
      msg === "Unauthorized workspace access" || msg.includes("Insufficient permissions")
        ? 403
        : 500;
    return NextResponse.json({ error: msg || "Failed to fetch webhooks" }, { status });
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
    const parseResult = registerWebhookSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
    }

    const workspaceId = parseResult.data.workspaceId;

    // Require settings permission (covers webhook management)
    await requireWorkspacePermission(workspaceId, user.id, "settings");

    const webhook = await WebhookService.registerWebhook({
      workspaceId,
      url: parseResult.data.url,
      events: parseResult.data.events,
    });
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const status =
      msg === "Unauthorized workspace access" || msg.includes("Insufficient permissions")
        ? 403
        : 400;
    return NextResponse.json({ error: msg || "Failed to register webhook" }, { status });
  }
}
