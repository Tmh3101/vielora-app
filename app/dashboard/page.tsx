import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { DashboardClient } from "@/components/dashboard/overview/DashboardClient";
import type { DashboardInitialData } from "@/hooks/dashboard/main/useDashboardData";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/constants/workspace";

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
  const workspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (!workspaceId) {
    let redirectUrl: string | null = null;
    try {
      const workspaces = await WorkspaceService.getUserWorkspaces(user.id);
      if (workspaces && workspaces.length > 0) {
        const firstWs = workspaces[0];
        redirectUrl = `/${firstWs.slug}`;
      } else {
        // Auto-create default workspace for new user if none exists
        const defaultWsId = await WorkspaceService.getOrCreateDefaultWorkspace(user.id);
        const userWs = await WorkspaceService.getUserWorkspaces(user.id);
        const targetWs = userWs.find((w) => w.id === defaultWsId) || userWs[0];
        if (targetWs?.slug) {
          redirectUrl = `/${targetWs.slug}`;
        }
      }
    } catch (err) {
      console.error("Error ensuring default workspace in /dashboard:", err);
    }

    if (redirectUrl) {
      redirect(redirectUrl);
    }
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
