import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { DashboardClient } from "@/components/dashboard/overview/DashboardClient";
import type { DashboardInitialData } from "@/hooks/dashboard/main/useDashboardData";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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

  if (!workspaceId) {
    let redirectUrl: string | null = null;
    try {
      const workspaces = await WorkspaceService.getUserWorkspaces(user.id);
      if (workspaces && workspaces.length > 0) {
        const firstWs = workspaces[0];
        redirectUrl = `/${firstWs.slug}`;
      }
    } catch {
      // DB error — fall through to "no workspace" message
    }

    if (redirectUrl) {
      redirect(redirectUrl);
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold">Welcome to Vielora</h2>
          <p className="mt-2 text-muted-foreground">
            You don&apos;t have any workspace yet. Use the sidebar to create one.
          </p>
        </div>
      </div>
    );
  }

  let initialData: DashboardInitialData | undefined = undefined;

  try {
    const dashData = await WorkspaceService.getWorkspaceDashboardData(workspaceId, user.id);
    initialData = {
      bots: dashData.bots,
      subscription: dashData.subscription,
      plan: dashData.plan,
      creditSummary: dashData.creditSummary,
      messagesThisMonth: dashData.messagesThisMonth,
      totalConversations: dashData.totalConversations,
      indexedPagesByBot: dashData.indexedPagesByBot,
      workspaceId: dashData.workspaceId,
    };
  } catch (error) {
    console.error("Error fetching workspace dashboard data:", error);
  }

  return <DashboardClient initialData={initialData} />;
}
