import { createAdminClient } from "@/lib/supabase/admin";
import {
  EWorkspaceRole,
  EWorkspaceInviteStatus,
  EWorkspaceMemberStatus,
  EWorkspaceStatus,
  EUsageAction,
} from "@/types/enums";
import { getBotsByWorkspaceId } from "@/lib/services/bot.service";
import { getSubscriptionByWorkspaceId } from "@/lib/services/subscription.service";
import {
  getWorkspaceCreditSummary,
  getWorkspaceMonthlyMessageCount,
} from "@/lib/services/credit.service";
import { getIndexedPageCountsByBotIds } from "@/lib/services/page.service";
import { getTotalConversationCount } from "@/lib/services/conversations.service";
import { getPlanById, getPlanByCode } from "@/lib/services/plan.service";

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
  settings?: Record<string, unknown>;
}

interface SubscriptionPlanItem {
  id?: string;
  name?: string;
  code?: string;
  [key: string]: unknown;
}

interface WorkspaceSubscription {
  id?: string;
  status?: string;
  billing_cycle?: string;
  current_period_start?: string;
  current_period_end?: string;
  plans?: SubscriptionPlanItem | SubscriptionPlanItem[] | null;
  [key: string]: unknown;
}

export class WorkspaceService {
  /**
   * List all workspaces the current user belongs to (up to max 5).
   */

  static async getUserWorkspaces(userId: string) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberships, error: memError } = await (supabase as any)
      .from("workspace_members")
      .select(
        `
        workspace_id,
        role_id,
        status,
        workspaces (
          id,
          name,
          slug,
          owner_id,
          status,
          created_at,
          subscriptions (
            id,
            status,
            plans (
              id,
              name,
              code
            )
          )
        )
      `
      )
      .eq("user_id", userId)
      .eq("status", "active");

    if (memError) throw memError;

    return (memberships || []).map(
      (
        m: Record<string, unknown> & {
          role_id?: string;
          workspaces?: Record<string, unknown> & {
            subscriptions?: WorkspaceSubscription | WorkspaceSubscription[];
          };
        }
      ) => {
        const ws = m.workspaces || {};
        const subsList: WorkspaceSubscription[] = Array.isArray(ws.subscriptions)
          ? ws.subscriptions
          : ws.subscriptions
            ? [ws.subscriptions]
            : [];
        const activeSub = subsList.find((s) => s.status === "active") || subsList[0];
        const planObj = Array.isArray(activeSub?.plans) ? activeSub?.plans[0] : activeSub?.plans;

        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          owner_id: ws.owner_id,
          status: ws.status,
          created_at: ws.created_at,
          role: m.role_id,
          plans: planObj
            ? {
                id: planObj.id,
                name: planObj.name,
                code: planObj.code,
              }
            : null,
        };
      }
    );
  }

  /**
   * Get single workspace by ID with member check.
   */
  static async getWorkspaceById(workspaceId: string, userId: string) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member, error: memError } = await (supabase as any)
      .from("workspace_members")
      .select("role_id, status")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (memError || !member) {
      throw new Error("Unauthorized workspace access");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspace, error: wsError } = await (supabase as any)
      .from("workspaces")
      .select(
        `
        *,
        subscriptions (
          id,
          status,
          billing_cycle,
          current_period_start,
          current_period_end,
          plans (*)
        )
      `
      )
      .eq("id", workspaceId)
      .single();

    if (wsError) throw wsError;

    const subsList: WorkspaceSubscription[] = Array.isArray(workspace.subscriptions)
      ? workspace.subscriptions
      : workspace.subscriptions
        ? [workspace.subscriptions]
        : [];
    const activeSub = subsList.find((s) => s.status === "active") || subsList[0];
    const planObj = Array.isArray(activeSub?.plans) ? activeSub?.plans[0] : activeSub?.plans;

    return {
      ...workspace,
      user_role: member.role_id,
      subscriptions: activeSub || null,
      plans: planObj || null,
    };
  }

  /**
   * Create a new workspace.
   */
  static async createWorkspace(userId: string, input: CreateWorkspaceInput) {
    const supabase = createAdminClient();

    // 1. Get default free plan
    const { data: freePlan, error: planErr } = await supabase
      .from("plans")
      .select("id, monthly_credits")
      .eq("code", "free")
      .single();

    if (planErr || !freePlan) throw new Error("Default plan not found");

    // 2. Insert workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspace, error: wsErr } = await (supabase as any)
      .from("workspaces")
      .insert({
        name: input.name,
        slug: input.slug.toLowerCase(),
        owner_id: userId,
        status: EWorkspaceStatus.Active,
      })
      .select()
      .single();

    if (wsErr) throw wsErr;

    // 3. Add user as Owner in workspace_members
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: memErr } = await (supabase as any).from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: userId,
      role_id: EWorkspaceRole.Owner,
      status: EWorkspaceMemberStatus.Active,
      accepted_at: new Date().toISOString(),
    });

    if (memErr) throw memErr;

    // 4. Create workspace wallet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("wallets").insert({
      workspace_id: workspace.id,
      subscription_credits: freePlan.monthly_credits ?? 1000,
      payg_credits: 0,
      is_payg_enabled: false,
    });

    // 5. Create default free subscription for workspace
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("subscriptions").insert({
      workspace_id: workspace.id,
      user_id: userId,
      plan_id: freePlan.id,
      billing_cycle: "monthly",
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: oneMonthLater.toISOString(),
      next_credit_reset_at: oneMonthLater.toISOString(),
      needs_bot_selection: false,
    });

    return workspace;
  }

  /**
   * Get an existing active workspace for a user or auto-create a default workspace.
   */
  static async getOrCreateDefaultWorkspace(userId: string): Promise<string> {
    const supabase = createAdminClient();

    // 1. Check active workspace membership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (supabase as any)
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("status", EWorkspaceMemberStatus.Active)
      .limit(1)
      .maybeSingle();

    if (member?.workspace_id) {
      return member.workspace_id;
    }

    // 2. Check workspace ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ws } = await (supabase as any)
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle();

    if (ws?.id) {
      return ws.id;
    }

    // 3. Auto-create default workspace if user has none
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email || "user";
    const rawUsername = userEmail.split("@")[0] || "user";
    const cleanBase = rawUsername.toLowerCase().replace(/[^a-z0-9]/g, "") || "ws";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const slug = `${cleanBase}-${randomSuffix}`;
    const name = `Workspace của ${rawUsername}`;

    const newWs = await WorkspaceService.createWorkspace(userId, { name, slug });
    return newWs.id;
  }

  /**
   * Update workspace properties with 30-day slug cooldown check.
   */
  static async updateWorkspace(workspaceId: string, userId: string, input: UpdateWorkspaceInput) {
    const supabase = createAdminClient();

    // Check membership and permissions (owner/admin)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (supabase as any)
      .from("workspace_members")
      .select("role_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", EWorkspaceMemberStatus.Active)
      .single();

    if (!member || ![EWorkspaceRole.Owner, EWorkspaceRole.Admin].includes(member.role_id)) {
      throw new Error("Forbidden: Insufficient permissions to update workspace");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentWs } = await (supabase as any)
      .from("workspaces")
      .select("slug, updated_at")
      .eq("id", workspaceId)
      .single();

    if (!currentWs) throw new Error("Workspace not found");

    // Slug cooldown check if slug is changing
    if (input.slug && input.slug.toLowerCase() !== currentWs.slug) {
      const lastUpdated = new Date(currentWs.updated_at).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastUpdated < thirtyDaysMs) {
        throw new Error("Slug can only be modified once every 30 days");
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.name) updatePayload.name = input.name;
    if (input.slug) updatePayload.slug = input.slug.toLowerCase();
    if (input.settings) updatePayload.settings = input.settings;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedWs, error } = await (supabase as any)
      .from("workspaces")
      .update(updatePayload)
      .eq("id", workspaceId)
      .select()
      .single();

    if (error) throw error;
    return updatedWs;
  }

  /**
   * Soft delete workspace.
   */
  static async deleteWorkspace(workspaceId: string, userId: string) {
    const supabase = createAdminClient();

    // Only owner can delete workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ws } = await (supabase as any)
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (!ws || ws.owner_id !== userId) {
      throw new Error("Forbidden: Only the workspace owner can delete it");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("workspaces")
      .update({ status: EWorkspaceStatus.Deleted, updated_at: new Date().toISOString() })
      .eq("id", workspaceId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Create workspace invitation (Only workspace Owner can invite).
   */
  static async createInvitation(
    workspaceId: string,
    invitedByUserId: string,
    email: string,
    roleId: string = EWorkspaceRole.Admin
  ) {
    const supabase = createAdminClient();

    // 1. Enforce Owner-only permission to invite members
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inviter } = await (supabase as any)
      .from("workspace_members")
      .select("role_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", invitedByUserId)
      .eq("status", EWorkspaceMemberStatus.Active)
      .single();

    if (!inviter || inviter.role_id !== EWorkspaceRole.Owner) {
      throw new Error("Chỉ có Chủ workspace (Owner) mới có quyền mời thành viên mới");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("workspace_invitations")
      .select("id, status")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .eq("status", EWorkspaceInviteStatus.Pending)
      .maybeSingle();

    if (existing) {
      throw new Error("Invitation already sent to this email");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email,
        role_id: roleId,
        invited_by: invitedByUserId,
        status: EWorkspaceInviteStatus.Pending,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Accept workspace invitation.
   */
  static async acceptInvitation(token: string, userId: string) {
    const supabase = createAdminClient();

    // 1. Fetch invitation by token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invitation, error: invError } = await (supabase as any)
      .from("workspace_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (invError || !invitation) {
      throw new Error("Mã lời mời không hợp lệ hoặc không tồn tại");
    }

    // 2. Check if revoked
    if (invitation.status === EWorkspaceInviteStatus.Revoked) {
      throw new Error("Lời mời này đã bị hủy bởi Quản trị viên workspace");
    }

    // 3. If invitation is already accepted, seamlessly return the workspace
    if (invitation.status === EWorkspaceInviteStatus.Accepted) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: workspace } = await (supabase as any)
        .from("workspaces")
        .select("slug")
        .eq("id", invitation.workspace_id)
        .single();

      if (workspace) return workspace;
    }

    // 4. Check expiration
    if (new Date(invitation.token_expires_at) < new Date()) {
      throw new Error("Lời mời này đã quá hạn 7 ngày");
    }

    // 5. Check if user is already a member of this workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingMember } = await (supabase as any)
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invitation.workspace_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingMember) {
      // Add member record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: memError } = await (supabase as any).from("workspace_members").insert({
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role_id: invitation.role_id,
        invited_by: invitation.invited_by,
        status: EWorkspaceMemberStatus.Active,
        accepted_at: new Date().toISOString(),
      });

      if (memError && !memError.message?.includes("unique_workspace_user")) {
        throw memError;
      }
    }

    // 6. Update invitation status to accepted
    if (invitation.status !== EWorkspaceInviteStatus.Accepted) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("workspace_invitations")
        .update({
          status: EWorkspaceInviteStatus.Accepted,
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        })
        .eq("id", invitation.id);
    }

    // 7. Get workspace slug for redirection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspace, error: wsError } = await (supabase as any)
      .from("workspaces")
      .select("slug")
      .eq("id", invitation.workspace_id)
      .single();

    if (wsError || !workspace) throw new Error("Workspace không tồn tại");

    return workspace;
  }

  /**
   * Get workspace members with user details.
   */
  static async getWorkspaceMembers(workspaceId: string) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: members, error } = await (supabase as any)
      .from("workspace_members")
      .select("user_id, role_id, status, accepted_at, invited_at")
      .eq("workspace_id", workspaceId);

    if (error) throw error;
    if (!members || members.length === 0) return [];

    // Fetch user info from Auth Admin API for each member
    const memberDetails = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      members.map(async (m: any) => {
        const { data: userData } = await supabase.auth.admin.getUserById(m.user_id);
        const u = userData?.user;
        return {
          userId: m.user_id,
          email: u?.email || null,
          name: u?.user_metadata?.full_name || u?.user_metadata?.name || null,
          role: m.role_id,
          status: m.status,
          joinedAt: m.accepted_at,
        };
      })
    );

    return memberDetails;
  }

  /**
   * Get pending invitations for a workspace with user name if registered in Auth DB.
   */
  static async getPendingInvitations(workspaceId: string) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invitations, error } = await (supabase as any)
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", EWorkspaceInviteStatus.Pending)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!invitations || invitations.length === 0) return [];

    // Check if invited emails exist in Auth DB to retrieve stored name
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      const authUsers = authData?.users || [];
      const emailToUserMap = new Map(authUsers.map((u) => [u.email?.toLowerCase(), u]));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return invitations.map((inv: any) => {
        const matchedUser = emailToUserMap.get(inv.email?.toLowerCase());
        const name =
          matchedUser?.user_metadata?.full_name || matchedUser?.user_metadata?.name || null;
        return {
          ...inv,
          name, // null if user is not in database
        };
      });
    } catch {
      return invitations;
    }
  }

  /**
   * Remove member from workspace (Only workspace owner or admin).
   */
  static async removeMember(workspaceId: string, memberUserId: string, operatorUserId: string) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: operator } = await (supabase as any)
      .from("workspace_members")
      .select("role_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", operatorUserId)
      .eq("status", EWorkspaceMemberStatus.Active)
      .single();

    if (!operator || ![EWorkspaceRole.Owner, EWorkspaceRole.Admin].includes(operator.role_id)) {
      throw new Error("Forbidden: Only workspace owner or admin can remove members");
    }

    // Prevent removing owner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetMember } = await (supabase as any)
      .from("workspace_members")
      .select("role_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", memberUserId)
      .single();

    if (targetMember?.role_id === EWorkspaceRole.Owner) {
      throw new Error("Cannot remove workspace owner");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", memberUserId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Revoke invitation (Only workspace owner or admin).
   */
  static async revokeInvitation(workspaceId: string, invitationId: string, operatorUserId: string) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: operator } = await (supabase as any)
      .from("workspace_members")
      .select("role_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", operatorUserId)
      .eq("status", EWorkspaceMemberStatus.Active)
      .single();

    if (!operator || ![EWorkspaceRole.Owner, EWorkspaceRole.Admin].includes(operator.role_id)) {
      throw new Error("Forbidden: Only workspace owner or admin can revoke invitations");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("workspace_invitations")
      .update({ status: EWorkspaceInviteStatus.Revoked })
      .eq("id", invitationId)
      .eq("workspace_id", workspaceId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Generate verified unique slug suggestions by querying the database.
   */
  static async getAvailableSlugSuggestions(baseSlug: string, count: number = 3): Promise<string[]> {
    const supabase = createAdminClient();
    const cleanBase =
      baseSlug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "") || "workspace";

    const candidates = [
      `${cleanBase}-1`,
      `${cleanBase}-2`,
      `${cleanBase}-3`,
      `${cleanBase}-app`,
      `${cleanBase}-workspace`,
      `${cleanBase}-${Math.floor(10 + Math.random() * 90)}`,
      `${cleanBase}-${Math.floor(100 + Math.random() * 900)}`,
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("workspaces")
      .select("slug")
      .in("slug", candidates);

    const existingSlugs = new Set((existing || []).map((w: { slug: string }) => w.slug));
    const available = candidates.filter((c) => !existingSlugs.has(c));

    return available.slice(0, count);
  }

  /**
   * Get workspace overview dashboard analytics.
   * Accessible by any active member (Owner, Admin, Member, Viewer) of the workspace.
   */
  static async getWorkspaceDashboardData(workspaceId: string, userId: string) {
    const supabase = createAdminClient();

    // 1. Verify user is an active workspace member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member, error: memError } = await (supabase as any)
      .from("workspace_members")
      .select("role_id, status")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", EWorkspaceMemberStatus.Active)
      .maybeSingle();

    if (memError || !member) {
      throw new Error("Unauthorized workspace access");
    }

    // 2. Fetch workspace bots, subscription, and credit summary via admin client
    const [botsData, subData, creditData] = await Promise.all([
      getBotsByWorkspaceId(supabase, workspaceId),
      getSubscriptionByWorkspaceId(supabase, workspaceId),
      getWorkspaceCreditSummary(supabase, workspaceId),
    ]);

    const botIds = (botsData || []).map((b: { id: string }) => b.id);
    const planId = subData?.plan_id;

    // 3. Fetch bot metrics (indexed pages, total conversations, plan details, messages this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [indexedCounts, convCount, planData, messagesThisMonth] = await Promise.all([
      botIds.length > 0 ? getIndexedPageCountsByBotIds(supabase, botIds) : Promise.resolve({}),
      botIds.length > 0 ? getTotalConversationCount(supabase, botIds) : Promise.resolve(0),
      planId ? getPlanById(supabase, planId) : getPlanByCode(supabase, "free"),
      getWorkspaceMonthlyMessageCount(
        supabase,
        workspaceId,
        EUsageAction.ChatMessage,
        startOfMonth
      ),
    ]);

    return {
      bots: botsData || [],
      subscription: subData || null,
      plan: planData || null,
      creditSummary: creditData || null,
      messagesThisMonth,
      totalConversations: convCount,
      indexedPagesByBot: indexedCounts,
      workspaceId,
      userRole: member.role_id,
    };
  }
}
