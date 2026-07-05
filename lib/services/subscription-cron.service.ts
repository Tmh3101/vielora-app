import type { ServiceClient } from "@/lib/services/types";
import {
  ETransactionType,
  ESubscriptionStatus,
  ESubscriptionCycle,
  ESubscriptionPlan,
} from "@/types";
import {
  sendSubscriptionDowngradeEmail,
  sendCreditResetEmail,
  sendSubscriptionExpiryReminderEmail,
  getUserEmailById,
} from "@/lib/services/email.service";

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
    .select("id, user_id")
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
        })
        .eq("id", sub.id);

      if (subError) throw new Error(`Failed to update subscription: ${subError.message}`);

      const { error: walletError } = await client
        .from("wallets")
        .update({ subscription_credits: freePlan.monthly_credits })
        .eq("user_id", sub.user_id);

      if (walletError) throw new Error(`Failed to update wallet: ${walletError.message}`);

      const { error: txError } = await client.from("credit_transactions").insert({
        user_id: sub.user_id,
        amount: freePlan.monthly_credits,
        transaction_type: ETransactionType.PlanDowngrade,
        description: "Downgraded to free plan due to subscription expiry",
      });

      if (txError) throw new Error(`Failed to insert credit_transaction: ${txError.message}`);

      // Stop all active bots — user will choose which to re-enable via Dashboard
      const { data: stoppedBots, error: stopBotsError } = await client
        .from("bots")
        .update({ is_stopped: true })
        .eq("user_id", sub.user_id)
        .eq("is_stopped", false)
        .select("id");

      if (stopBotsError) {
        console.error(
          `[SubscriptionCron] Scenario A: ⚠ Failed to stop bots for user ${sub.user_id}:`,
          stopBotsError.message
        );
      } else {
        const stoppedCount = stoppedBots?.length ?? 0;
        result.botsStopped += stoppedCount;
        if (stoppedCount > 0) {
          console.log(
            `[SubscriptionCron] Scenario A: Stopped ${stoppedCount} bot(s) for user ${sub.user_id}`
          );
        }
      }

      result.downgraded++;
      console.log(
        `[SubscriptionCron] Scenario A: ✓ Downgraded user ${sub.user_id} (sub ${sub.id})`
      );

      // Send downgrade notification email (non-blocking)
      const userInfo = await getUserEmailById(client, sub.user_id);
      if (userInfo) {
        await sendSubscriptionDowngradeEmail(userInfo.email, userInfo.fullName, {
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

  // Scenario B: Monthly credit reset for active subscriptions
  console.log("[SubscriptionCron] Scenario B: Checking for subscriptions due for credit reset…");

  const { data: resetSubs, error: resetSubsError } = await client
    .from("subscriptions")
    .select("id, user_id, next_credit_reset_at, plans(monthly_credits)")
    .gt("current_period_end", nowIso)
    .lte("next_credit_reset_at", nowIso);

  if (resetSubsError) {
    throw new Error(
      `processSubscriptionLifecycle: failed to fetch reset subs — ${resetSubsError.message}`
    );
  }

  const resetList = resetSubs ?? [];
  console.log(
    `[SubscriptionCron] Scenario B: ${resetList.length} subscription(s) due for credit reset`
  );

  for (const sub of resetList) {
    try {
      const planData = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
      if (!planData?.monthly_credits) {
        throw new Error("Could not resolve monthly_credits from joined plan data");
      }

      // Advance based on current value to avoid drift
      const nextResetIso = addOneMonth(new Date(sub.next_credit_reset_at)).toISOString();

      const { error: subError } = await client
        .from("subscriptions")
        .update({ next_credit_reset_at: nextResetIso })
        .eq("id", sub.id);

      if (subError) throw new Error(`Failed to advance next_credit_reset_at: ${subError.message}`);

      const { error: walletError } = await client
        .from("wallets")
        .update({ subscription_credits: planData.monthly_credits })
        .eq("user_id", sub.user_id);

      if (walletError) throw new Error(`Failed to update wallet: ${walletError.message}`);

      const { error: txError } = await client.from("credit_transactions").insert({
        user_id: sub.user_id,
        amount: planData.monthly_credits,
        transaction_type: ETransactionType.MonthlyReset,
        description: "Reset credits for new billing cycle",
      });

      if (txError) throw new Error(`Failed to insert credit_transaction: ${txError.message}`);

      result.creditsReset++;
      console.log(
        `[SubscriptionCron] Scenario B: ✓ Reset credits for user ${sub.user_id} (sub ${sub.id}) → next reset: ${nextResetIso}`
      );

      // Send credit reset notification email (non-blocking)
      const userInfo = await getUserEmailById(client, sub.user_id);
      if (userInfo) {
        await sendCreditResetEmail(userInfo.email, userInfo.fullName, {
          planName: "Gói hiện tại",
          monthlyCredits: planData.monthly_credits,
          nextResetDate: new Date(nextResetIso).toLocaleDateString("vi-VN"),
        });
      }
    } catch (err) {
      result.creditResetFailed++;
      console.error(
        `[SubscriptionCron] Scenario B: ✗ Failed for user ${sub.user_id} (sub ${sub.id}) —`,
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
    .select("id, user_id, current_period_end, plans(name)")
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
      const userInfo = await getUserEmailById(client, sub.user_id);
      if (!userInfo) continue;

      const planData = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
      const planName = planData?.name ?? "Trả phí";
      const expiryDate = new Date(sub.current_period_end).toLocaleDateString("vi-VN");
      const daysRemaining = Math.max(
        1,
        Math.ceil(
          (new Date(sub.current_period_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      await sendSubscriptionExpiryReminderEmail(userInfo.email, userInfo.fullName, {
        planName,
        expiryDate,
        daysRemaining,
      });

      result.remindersSent++;
      console.log(
        `[SubscriptionCron] Expiry Reminder: ✓ Sent to user ${sub.user_id} (${daysRemaining} days left)`
      );
    } catch (err) {
      result.remindersFailed++;
      console.error(
        `[SubscriptionCron] Expiry Reminder: ✗ Failed for user ${sub.user_id} —`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  console.log(
    `[SubscriptionCron] Expiry Reminder Done — Sent: ${result.remindersSent} (failed: ${result.remindersFailed})`
  );

  return result;
}
