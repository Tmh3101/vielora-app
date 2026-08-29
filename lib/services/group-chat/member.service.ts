import type { ServiceClient } from "@/lib/services/types";
import { getGroupChatUrl } from "@/lib/utils/standalone-chat-url";
import { GROUP_MEMBER_CAP_REACHED_CODE, GROUP_ALREADY_MEMBER_CODE } from "@/lib/constants";
import { GroupServiceError, type GroupMemberRow } from "@/types/group-chat";

export async function findAuthUserByEmail(
  adminClient: ServiceClient,
  email: string
): Promise<{ id: string; email: string } | null> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Try fast indexed RPC search first
  try {
    const { data: rpcUsers, error: rpcError } = await adminClient.rpc("get_auth_user_by_email", {
      p_email: normalizedEmail,
    });

    if (!rpcError && Array.isArray(rpcUsers) && rpcUsers.length > 0) {
      const u = rpcUsers[0] as { id: string; email: string | null };
      return { id: u.id, email: u.email || normalizedEmail };
    }
  } catch {
    // Fallback if RPC is not available in mock/testing
  }

  // 2. Fallback to targeted search
  try {
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 50 });
    const users = (data?.users || []) as Array<{ id: string; email?: string | null }>;
    if (!error && users.length > 0) {
      const found = users.find((u) => u.email?.toLowerCase() === normalizedEmail);
      if (found) {
        return { id: found.id, email: found.email || normalizedEmail };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function inviteGroupMember(
  adminClient: ServiceClient,
  params: {
    groupId: string;
    email: string;
    invitedBy: string;
    botName: string;
    inviterName: string;
  }
): Promise<{ member: GroupMemberRow; isNewAccount: boolean }> {
  const { groupId, email, invitedBy, botName, inviterName } = params;
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Check dynamic member limit via workspace plan
  const { count, error: countErr } = await adminClient
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (countErr) throw countErr;

  // Resolve dynamic limit from workspace plan
  let maxMembers = 5;
  try {
    const { data: groupData } = await adminClient
      .from("group_chats")
      .select("bot_id")
      .eq("id", groupId)
      .single();

    if (groupData?.bot_id) {
      const { data: botData } = await adminClient
        .from("bots")
        .select("workspace_id")
        .eq("id", groupData.bot_id)
        .single();

      if (botData?.workspace_id) {
        const { data: subData } = await adminClient
          .from("subscriptions")
          .select("plan_id")
          .eq("workspace_id", botData.workspace_id)
          .eq("status", "active")
          .maybeSingle();

        if (subData?.plan_id) {
          const { data: planData } = await adminClient
            .from("plans")
            .select("max_members")
            .eq("id", subData.plan_id)
            .maybeSingle();

          if (planData && planData.max_members) {
            maxMembers = Math.max(5, planData.max_members);
          }
        }
      }
    }
  } catch {
    maxMembers = 5;
  }

  if ((count ?? 0) >= maxMembers) {
    throw new GroupServiceError("GROUP_MEMBER_LIMIT_REACHED", GROUP_MEMBER_CAP_REACHED_CODE);
  }

  // 2. Compute group destination URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vielora.vn";
  let groupUrl: string | undefined;

  const { data: groupData } = await adminClient
    .from("group_chats")
    .select("bot_id")
    .eq("id", groupId)
    .single();

  if (groupData?.bot_id) {
    const { data: botData } = await adminClient
      .from("bots")
      .select("slug")
      .eq("id", groupData.bot_id)
      .single();

    if (botData?.slug) {
      groupUrl = getGroupChatUrl(botData.slug);
    }
  }

  // 3. Check if auth user exists
  let targetUser = await findAuthUserByEmail(adminClient, normalizedEmail);
  let isNewAccount = false;
  let actionUrl: string | undefined;

  if (!targetUser) {
    // Create new unconfirmed auth user
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: false,
    });
    if (createErr) throw createErr;
    targetUser = { id: newUser.user.id, email: newUser.user.email || normalizedEmail };
    isNewAccount = true;

    // Generate magic link with redirect to groupUrl
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo: groupUrl || appUrl,
      },
    });
    if (!linkErr && linkData?.properties?.action_link) {
      actionUrl = linkData.properties.action_link;
    }
  }

  // 4. Insert into group_members
  const { data: member, error: insertErr } = await adminClient
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: targetUser.id,
      email: normalizedEmail,
      invited_by: invitedBy,
      can_pin_knowledge: false,
      role_label: null,
    })
    .select("*")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      throw new GroupServiceError(
        "User is already a member of this group",
        GROUP_ALREADY_MEMBER_CODE
      );
    }
    throw insertErr;
  }

  // 5. Send email notification (non-blocking)
  const { sendGroupInviteEmail } = await import("@/lib/services/email.service");
  sendGroupInviteEmail(normalizedEmail, {
    botName,
    invitedByName: inviterName,
    actionUrl,
    groupUrl,
    isNewAccount,
  }).catch((err) => console.error("Failed to send group invite email:", err));

  return { member: member as GroupMemberRow, isNewAccount };
}

export async function removeGroupMember(
  client: ServiceClient,
  groupId: string,
  memberId: string
): Promise<void> {
  const { error } = await client
    .from("group_members")
    .delete()
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (error) throw error;
}

export async function updateGroupMember(
  client: ServiceClient,
  groupId: string,
  memberId: string,
  updates: {
    role_label?: string | null;
    can_pin_knowledge?: boolean;
    can_create_note?: boolean;
    can_export_report?: boolean;
    canExportReport?: boolean;
  }
): Promise<GroupMemberRow> {
  const { data, error } = await client
    .from("group_members")
    .update(updates)
    .eq("id", memberId)
    .eq("group_id", groupId)
    .select("*")
    .single();

  if (error) throw error;
  return data as GroupMemberRow;
}

export async function leaveGroup(
  client: ServiceClient,
  groupId: string,
  userId: string
): Promise<void> {
  const { error } = await client
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) throw error;
}
