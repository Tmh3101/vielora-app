import type { ServiceClient } from "@/lib/services/types";
import {
  ETransactionType,
  ESubscriptionStatus,
  ESubscriptionCycle,
  ESubscriptionPlan,
  EWorkspaceStatus,
} from "@/types";
import {
  sendSubscriptionDowngradeEmail,
  sendSubscriptionExpiryReminderEmail,
  getUserEmailById,
  getWorkspaceMemberEmails,
} from "@/lib/services/email.service";
import { clearBotWidgetCache } from "@/lib/cache";

function addOneMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  return result;
}

export interface LifecycleResult {
  downgraded: number;
  downgradeFailed: number;
  botsStopped: number;
  creditsReset: number;
  creditResetFailed: number;
}

export async function processSubscriptionLifecycle(
  client: ServiceClient
): Promise<LifecycleResult> {
  const now = new Date();
  const nowIso = now.toISOString();
  const nextMonthIso = addOneMonth(now).toISOString();

  const result: LifecycleResult = {
    downgraded: 0,
    downgradeFailed: 0,
    botsStopped: 0,
    creditsReset: 0,
    creditResetFailed: 0,
  };

  const { data: freePlan, error: freePlanError } = await client
    .from("plans")
    .select("id, monthly_credits, bots_limit")
    .eq("code", ESubscriptionPlan.Free)
    .single();

  if (freePlanError || !freePlan) {
    throw new Error(
      `processSubscriptionLifecycle: failed to fetch free plan — ${freePlanError?.message}`
    );
  }

  // Scenario A: Downgrade expired subscriptions
  console.log("[SubscriptionCron] Scenario A: Checking for expired subscriptions…");

  const { data: expiredSubs, error: expiredSubsError } = await client
    .from("subscriptions")
    .select("id, user_id, workspace_id")
    .lte("current_period_end", nowIso)
    .neq("plan_id", freePlan.id);

  if (expiredSubsError) {
    throw new Error(
      `processSubscriptionLifecycle: failed to fetch expired subs — ${expiredSubsError.message}`
    );
  }

  const expiredList = expiredSubs ?? [];
  console.log(`[SubscriptionCron] Scenario A: ${expiredList.length} expired subscription(s) found`);

  for (const sub of expiredList) {
    try {
      const { error: subError } = await client
        .from("subscriptions")
        .update({
          plan_id: freePlan.id,
          billing_cycle: ESubscriptionCycle.Monthly,
          status: ESubscriptionStatus.Active,
          current_period_start: nowIso,
          current_period_end: nextMonthIso,
          next_credit_reset_at: nextMonthIso,
          needs_bot_selection: true,
          bots_limit_override: null,
          monthly_credits_override: null,
        })
        .eq("id", sub.id);

      if (subError) throw new Error(`Failed to update subscription: ${subError.message}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: walletError } = await (client as any)
        .from("wallets")
        .update({ subscription_credits: freePlan.monthly_credits })
        .eq("workspace_id", sub.workspace_id);

      if (walletError) throw new Error(`Failed to update wallet: ${walletError.message}`);

      const { error: txError } = await client.from("credit_transactions").insert({
        workspace_id: sub.workspace_id,
        amount: freePlan.monthly_credits,
        transaction_type: ETransactionType.PlanDowngrade,
        description: "Downgraded to free plan due to subscription expiry",
      });

      if (txError) throw new Error(`Failed to insert credit_transaction: ${txError.message}`);

      // Stop all active bots — user will choose which to re-enable via Dashboard
      const stopBotsQuery = client
        .from("bots")
        .update({ is_stopped: true })
        .eq("is_stopped", false)
        .select("id");
      const stopBotsBuilder = sub.workspace_id
        ? stopBotsQuery.eq("workspace_id", sub.workspace_id)
        : stopBotsQuery.eq("user_id", sub.user_id);
      const { data: stoppedBots, error: stopBotsError } = await stopBotsBuilder;

      if (stopBotsError) {
        console.error(
          `[SubscriptionCron] Scenario A: ⚠ Failed to stop bots for sub ${sub.id}:`,
          stopBotsError.message
        );
      } else {
        const stoppedCount = stoppedBots?.length ?? 0;
        result.botsStopped += stoppedCount;
        if (stoppedCount > 0) {
          console.log(
            `[SubscriptionCron] Scenario A: Stopped ${stoppedCount} bot(s) for sub ${sub.id}`
          );
          Promise.all(
            (stoppedBots ?? []).map((b: { id: string }) => clearBotWidgetCache(b.id))
          ).catch(console.error);
        }
      }

      result.downgraded++;
      console.log(`[SubscriptionCron] Scenario A: ✓ Downgraded sub ${sub.id}`);

      // Send downgrade notification email to all workspace members (non-blocking)
      let recipients: Array<{ email: string; fullName: string }> = [];
      if (sub.workspace_id) {
        recipients = await getWorkspaceMemberEmails(client, sub.workspace_id);
      }
      if (recipients.length === 0) {
        const userInfo = await getUserEmailById(client, sub.user_id);
        if (userInfo) recipients = [userInfo];
      }

      for (const recipient of recipients) {
        await sendSubscriptionDowngradeEmail(recipient.email, recipient.fullName, {
          oldPlanName: "Trả phí",
          expiryDate: new Date(nowIso).toLocaleDateString("vi-VN"),
        });
      }
    } catch (err) {
      result.downgradeFailed++;
      console.error(
        `[SubscriptionCron] Scenario A: ✗ Failed for user ${sub.user_id} (sub ${sub.id}) —`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  // Scenario B: Monthly credit reset for active workspaces
  console.log("[SubscriptionCron] Scenario B: Checking for active workspaces for credit reset…");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activeWorkspaces, error: activeWsError } = await (client as any)
    .from("workspaces")
    .select("id, name, owner_id")
    .eq("status", EWorkspaceStatus.Active);

  if (activeWsError) {
    throw new Error(
      `processSubscriptionLifecycle: failed to fetch active workspaces — ${activeWsError.message}`
    );
  }

  const workspaceList = activeWorkspaces ?? [];
  console.log(
    `[SubscriptionCron] Scenario B: ${workspaceList.length} active workspace(s) found for credit reset`
  );

  for (const ws of workspaceList) {
    try {
      let monthlyCredits = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: subData } = await (client as any)
        .from("subscriptions")
        .select("plan_id, monthly_credits_override, plans(monthly_credits)")
        .eq("workspace_id", ws.id)
        .eq("status", ESubscriptionStatus.Active)
        .maybeSingle();

      if (subData) {
        const planObj = (Array.isArray(subData.plans) ? subData.plans[0] : subData.plans) as {
          monthly_credits: number;
        } | null;
        monthlyCredits = subData.monthly_credits_override ?? planObj?.monthly_credits ?? 0;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: walletError } = await (client as any)
        .from("wallets")
        .update({ subscription_credits: monthlyCredits })
        .eq("workspace_id", ws.id);

      if (walletError) throw new Error(`Failed to update wallet: ${walletError.message}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: txError } = await (client as any).from("credit_transactions").insert({
        workspace_id: ws.id,
        amount: monthlyCredits,
        transaction_type: ETransactionType.MonthlyReset,
        description: `Reset credits for workspace ${ws.name || ws.id}`,
      });

      if (txError) {
        console.warn(
          `[SubscriptionCron] Scenario B: Warning recording credit transaction for workspace ${ws.id}:`,
          txError.message
        );
      }

      result.creditsReset++;
      console.log(
        `[SubscriptionCron] Scenario B: ✓ Reset credits for workspace ${ws.name || ws.id} (${ws.id}) → ${monthlyCredits} credits`
      );
    } catch (err) {
      result.creditResetFailed++;
      console.error(
        `[SubscriptionCron] Scenario B: ✗ Failed for workspace ${ws.id} —`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  console.log(
    `[SubscriptionCron] Done — Downgraded: ${result.downgraded} (failed: ${result.downgradeFailed}) | ` +
      `Bots stopped: ${result.botsStopped} | ` +
      `Credits reset: ${result.creditsReset} (failed: ${result.creditResetFailed})`
  );

  return result;
}

// ============================================================
// UC6 — Subscription expiry reminder (3 days before)
// ============================================================

export interface ExpiryReminderResult {
  remindersSent: number;
  remindersFailed: number;
}

export async function processExpiryReminders(client: ServiceClient): Promise<ExpiryReminderResult> {
  const result: ExpiryReminderResult = { remindersSent: 0, remindersFailed: 0 };

  console.log("[SubscriptionCron] Expiry Reminder: Checking for subscriptions expiring soon…");

  const { data: freePlan } = await client
    .from("plans")
    .select("id")
    .eq("code", ESubscriptionPlan.Free)
    .single();

  if (!freePlan) {
    console.error("[SubscriptionCron] Expiry Reminder: Cannot fetch free plan — skipping");
    return result;
  }

  // Find subscriptions expiring within the next 3 days (but not yet expired)
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: expiringSubs, error } = await client
    .from("subscriptions")
    .select("id, user_id, workspace_id, current_period_end, plans(name)")
    .gt("current_period_end", now.toISOString())
    .lte("current_period_end", threeDaysLater.toISOString())
    .neq("plan_id", freePlan.id);

  if (error) {
    console.error("[SubscriptionCron] Expiry Reminder: Query failed —", error.message);
    return result;
  }

  const list = expiringSubs ?? [];
  console.log(
    `[SubscriptionCron] Expiry Reminder: ${list.length} subscription(s) expiring within 3 days`
  );

  for (const sub of list) {
    try {
      let recipients: Array<{ email: string; fullName: string }> = [];
      if (sub.workspace_id) {
        recipients = await getWorkspaceMemberEmails(client, sub.workspace_id);
      }
      if (recipients.length === 0) {
        const userInfo = await getUserEmailById(client, sub.user_id);
        if (userInfo) recipients = [userInfo];
      }

      if (recipients.length === 0) continue;

      const planData = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
      const planName = planData?.name ?? "Trả phí";
      const expiryDate = new Date(sub.current_period_end).toLocaleDateString("vi-VN");
      const daysRemaining = Math.max(
        1,
        Math.ceil(
          (new Date(sub.current_period_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      for (const recipient of recipients) {
        await sendSubscriptionExpiryReminderEmail(recipient.email, recipient.fullName, {
          planName,
          expiryDate,
          daysRemaining,
        });
      }

      result.remindersSent += recipients.length;
      console.log(
        `[SubscriptionCron] Expiry Reminder: ✓ Sent to ${recipients.length} member(s) for sub ${sub.id} (${daysRemaining} days left)`
      );
    } catch (err) {
      result.remindersFailed++;
      console.error(
        `[SubscriptionCron] Expiry Reminder: ✗ Failed for sub ${sub.id} —`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  console.log(
    `[SubscriptionCron] Expiry Reminder Done — Sent: ${result.remindersSent} (failed: ${result.remindersFailed})`
  );

  return result;
}
