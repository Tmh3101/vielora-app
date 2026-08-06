import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspaceService } from "@/lib/services/workspace.service";
import {
  sendWorkspaceInvitationEmail,
  type InvitationEmailData,
} from "@/lib/services/email.service";
import { z } from "zod";
import { EWorkspaceRole } from "@/types/enums";
import { requireWorkspacePermission } from "@/lib/services/workspace-knowledge.service";

const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role_id: z.nativeEnum(EWorkspaceRole).default(EWorkspaceRole.Admin),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require invite permission to create invitations
    await requireWorkspacePermission(id, user.id, "invite");

    const body = await request.json();
    const parseResult = createInviteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
    }

    const invitation = await WorkspaceService.createInvitation(
      id,
      user.id,
      parseResult.data.email,
      parseResult.data.role_id
    );

    try {
      const workspace = await WorkspaceService.getWorkspaceById(id, user.id);
      const invitedByName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "A team member";

      const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/accept-invite?token=${invitation.token}`;

      const emailData: InvitationEmailData = {
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        invitedByName,
        acceptUrl,
      };

      await sendWorkspaceInvitationEmail(parseResult.data.email, emailData);
    } catch (emailErr) {
      console.error("Failed to send workspace invitation email:", emailErr);
    }

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const status =
      msg === "Unauthorized workspace access" || msg.includes("Insufficient permissions")
        ? 403
        : 400;
    return NextResponse.json({ error: msg || "Failed to create invitation" }, { status });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require invite permission to list invitations (exposes tokens)
    await requireWorkspacePermission(id, user.id, "invite");

    const invitations = await WorkspaceService.getPendingInvitations(id);
    return NextResponse.json({ invitations });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const status =
      msg === "Unauthorized workspace access" || msg.includes("Insufficient permissions")
        ? 403
        : 500;
    return NextResponse.json({ error: msg || "Failed to fetch invitations" }, { status });
  }
}
