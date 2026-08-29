import type { SupabaseClient } from "@supabase/supabase-js";
import { EWorkspaceMemberStatus } from "@/types/enums";

/**
 * 3-tier permission helper to determine if a user can export reports for a bot in a workspace.
 * Tier 1: Owner/Admin (hierarchy >= 80) in workspace_members
 * Tier 2: Workspace role permission key "reports": true (from workspace_roles.permissions JSON)
 * Tier 3: Group member with can_export_report = true for a group connected to this bot
 *
 * NOTE: Uses only the `client` passed in (browser or server) — does NOT import any
 * server-only/admin client, so this module is safe to use inside Client Components.
 */
export async function canExportReport(
  client: SupabaseClient,
  workspaceId: string,
  botId: string,
  userId: string
): Promise<boolean> {
  // Tier 1 & 2: Workspace member hierarchy >= 80 OR permissions.reports === true
  try {
    const { data: memberRole, error: memberError } = await client
      .from("workspace_members")
      .select("workspace_roles(hierarchy, permissions)")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", EWorkspaceMemberStatus.Active)
      .maybeSingle();

    if (memberError) {
      console.error("[ReportPermission] Member role fetch error:", memberError);
    } else if (memberRole) {
      const roleData = Array.isArray(memberRole.workspace_roles)
        ? memberRole.workspace_roles[0]
        : memberRole.workspace_roles;

      const hierarchy = roleData?.hierarchy !== undefined ? Number(roleData.hierarchy) : NaN;
      if (!Number.isNaN(hierarchy) && hierarchy >= 80) {
        return true;
      }

      const permissions = roleData?.permissions as Record<string, boolean> | undefined;
      if (permissions && permissions.reports === true) {
        return true;
      }
    }
  } catch (err) {
    console.error("[ReportPermission] Tier 1/2 check error:", err);
  }

  // Tier 3: Group member with can_export_report = true for a group of this bot
  try {
    const { data: groupMember, error: groupError } = await client
      .from("group_members")
      .select("can_export_report, group_chats!inner(bot_id)")
      .eq("user_id", userId)
      .eq("can_export_report", true)
      .eq("group_chats.bot_id", botId)
      .maybeSingle();

    if (groupError) {
      console.error("[ReportPermission] Group member check error:", groupError);
      return false;
    }
    return !!groupMember;
  } catch (err) {
    console.error("[ReportPermission] Tier 3 check error:", err);
    return false;
  }
}

/**
 * Check if a user is a workspace admin/owner (hierarchy >= 80).
 * Used to guard administrative actions such as review and branding management.
 */
export async function isWorkspaceAdmin(
  client: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data: memberRole, error } = await client
      .from("workspace_members")
      .select("workspace_roles(hierarchy)")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", EWorkspaceMemberStatus.Active)
      .maybeSingle();

    if (error || !memberRole) return false;
    const roleData = Array.isArray(memberRole.workspace_roles)
      ? memberRole.workspace_roles[0]
      : memberRole.workspace_roles;
    const hierarchy = roleData?.hierarchy !== undefined ? Number(roleData.hierarchy) : NaN;
    return !Number.isNaN(hierarchy) && hierarchy >= 80;
  } catch (err) {
    console.error("[ReportPermission] Admin check error:", err);
    return false;
  }
}
