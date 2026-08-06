import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspaceKnowledgeClient } from "@/components/dashboard/workspace-knowledge/WorkspaceKnowledgeClient";

export const dynamic = "force-dynamic";

export default async function WorkspaceKnowledgePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("active_workspace_id")?.value;

  return <WorkspaceKnowledgeClient initialWorkspaceId={workspaceId} />;
}
