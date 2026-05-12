/**
 * Test script for Bot Lifecycle on Subscription Change
 *
 * Usage: npx tsx tmp/test-subscription-cron.ts
 *
 * Flow:
 * 1. Finds your subscription
 * 2. Simulates expiry (sets current_period_end to past)
 * 3. Runs processSubscriptionLifecycle logic
 * 4. Verifies: subscription downgraded, bots stopped, needs_bot_selection = true
 * 5. Optionally reverts all changes
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing env vars");
  process.exit(1);
}

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
  }

  return { url, anonKey, serviceRoleKey };
}

function createAdminClient() {
  const { url, serviceRoleKey } = getEnv();

  if (!serviceRoleKey) {
    throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const supabase = createAdminClient();

// ── Target user (change this to your user_id) ──
const TARGET_USER_ID = "58601745-7d26-4289-88b1-43267c9ee426";

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🧪 Test: Bot Lifecycle on Subscription Change");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Fetch current state
  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "id, plan_id, current_period_end, needs_bot_selection, plans!inner(code, name, bots_limit)"
    )
    .eq("user_id", TARGET_USER_ID)
    .single();

  if (!sub) {
    console.error("❌ No subscription found for user", TARGET_USER_ID);
    process.exit(1);
  }

  const plan = sub.plans as unknown as { code: string; name: string; bots_limit: number };
  console.log("📌 Current state:");
  console.log(`   Plan: ${plan.name} (${plan.code}), bots_limit: ${plan.bots_limit}`);
  console.log(`   Period End: ${sub.current_period_end}`);
  console.log(`   needs_bot_selection: ${sub.needs_bot_selection}`);

  const { data: bots } = await supabase
    .from("bots")
    .select("id, name, is_stopped")
    .eq("user_id", TARGET_USER_ID);

  console.log(`   Bots (${bots?.length || 0}):`);
  bots?.forEach((b) => console.log(`     - ${b.name}: is_stopped=${b.is_stopped}`));

  // Save original state for revert
  const original = {
    plan_id: sub.plan_id,
    current_period_end: sub.current_period_end,
    needs_bot_selection: sub.needs_bot_selection,
    bots: bots?.map((b) => ({ id: b.id, is_stopped: b.is_stopped })) || [],
  };

  const { data: wallet } = await supabase
    .from("wallets")
    .select("subscription_credits")
    .eq("user_id", TARGET_USER_ID)
    .single();
  const originalCredits = wallet?.subscription_credits;

  // Check if already on free plan
  if (plan.code === "free") {
    console.log("\n⚠ User is already on Free plan.");
    console.log("  To test downgrade, first upgrade the user to Standard/Pro.");
    console.log(
      "  Alternatively, you can set needs_bot_selection = true directly to test the modal:"
    );
    console.log("\n  Run in SQL Editor:");
    console.log(
      `  UPDATE subscriptions SET needs_bot_selection = true WHERE user_id = '${TARGET_USER_ID}';`
    );
    console.log(`  UPDATE bots SET is_stopped = true WHERE user_id = '${TARGET_USER_ID}';`);
    process.exit(0);
  }

  // 2. Simulate expiry
  const pastDate = new Date(Date.now() - 86400000).toISOString();
  console.log(`\n⏰ Simulating expiry: setting current_period_end to ${pastDate}`);

  await supabase.from("subscriptions").update({ current_period_end: pastDate }).eq("id", sub.id);

  // 3. Run lifecycle logic (inline to avoid import issues)
  console.log("\n🚀 Running processSubscriptionLifecycle logic...\n");

  const { data: freePlan } = await supabase
    .from("plans")
    .select("id, monthly_credits, bots_limit")
    .eq("code", "free")
    .single();

  if (!freePlan) {
    console.error("❌ Free plan not found");
    process.exit(1);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthIso = nextMonth.toISOString();

  // Downgrade subscription
  const { error: subErr } = await supabase
    .from("subscriptions")
    .update({
      plan_id: freePlan.id,
      billing_cycle: "monthly",
      status: "active",
      current_period_start: nowIso,
      current_period_end: nextMonthIso,
      next_credit_reset_at: nextMonthIso,
      needs_bot_selection: true,
    })
    .eq("id", sub.id);

  if (subErr) {
    console.error("❌ Failed to downgrade:", subErr.message);
  } else {
    console.log("  ✅ Subscription downgraded to Free");
    console.log("  ✅ needs_bot_selection = true");
  }

  // Reset wallet
  await supabase
    .from("wallets")
    .update({ subscription_credits: freePlan.monthly_credits })
    .eq("user_id", TARGET_USER_ID);
  console.log(`  ✅ Wallet credits reset to ${freePlan.monthly_credits}`);

  // Stop all active bots
  const { data: stoppedBots } = await supabase
    .from("bots")
    .update({ is_stopped: true })
    .eq("user_id", TARGET_USER_ID)
    .eq("is_stopped", false)
    .select("id, name");

  console.log(`  ✅ Stopped ${stoppedBots?.length || 0} bot(s)`);
  stoppedBots?.forEach((b) => console.log(`     - ${b.name}`));

  // Record transaction
  await supabase.from("credit_transactions").insert({
    user_id: TARGET_USER_ID,
    amount: freePlan.monthly_credits,
    transaction_type: "plan_downgrade",
    description: "[TEST] Downgraded to free plan due to subscription expiry",
  });
  console.log("  ✅ Credit transaction recorded");

  // 4. Verify
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  📊 Verification");
  console.log("═══════════════════════════════════════════════════════════");

  const { data: verSub } = await supabase
    .from("subscriptions")
    .select("needs_bot_selection, plans!inner(code, name)")
    .eq("id", sub.id)
    .single();

  const verPlan = verSub?.plans as unknown as { code: string; name: string } | undefined;
  console.log(`  Plan: ${plan.name} → ${verPlan?.name} ${verPlan?.code === "free" ? "✅" : "❌"}`);
  console.log(
    `  needs_bot_selection: ${verSub?.needs_bot_selection} ${verSub?.needs_bot_selection ? "✅" : "❌"}`
  );

  const { data: verBots } = await supabase
    .from("bots")
    .select("name, is_stopped")
    .eq("user_id", TARGET_USER_ID);

  const allStopped = verBots?.every((b) => b.is_stopped);
  console.log(`  All bots stopped: ${allStopped} ${allStopped ? "✅" : "❌"}`);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  🎯 Next: Go to http://localhost:3000/dashboard");
  console.log("     → Modal should appear to select bot(s)");
  console.log("     → Select bot(s) and confirm");
  console.log("     → Reload page → modal should NOT appear again");
  console.log("═══════════════════════════════════════════════════════════");

  // 5. Ask to revert
  console.log("\n⚠ Do you want to REVERT all changes? (y/n)");
  console.log("  Type 'n' to keep changes and test the modal on Dashboard.\n");

  const readline = await import("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => rl.question("  > ", resolve));
  rl.close();

  if (answer.toLowerCase() === "y") {
    console.log("\n🔄 Reverting...");

    await supabase
      .from("subscriptions")
      .update({
        plan_id: original.plan_id,
        current_period_end: original.current_period_end,
        needs_bot_selection: original.needs_bot_selection,
      })
      .eq("id", sub.id);

    if (originalCredits != null) {
      await supabase
        .from("wallets")
        .update({ subscription_credits: originalCredits })
        .eq("user_id", TARGET_USER_ID);
    }

    for (const bot of original.bots) {
      await supabase.from("bots").update({ is_stopped: bot.is_stopped }).eq("id", bot.id);
    }

    await supabase
      .from("credit_transactions")
      .delete()
      .eq("user_id", TARGET_USER_ID)
      .eq("transaction_type", "plan_downgrade")
      .like("description", "%[TEST]%");

    console.log("  ✅ All changes reverted!\n");
  } else {
    console.log("\n  📌 Changes kept. Go test the Dashboard modal!\n");
  }
}

main().catch((err) => {
  console.error("❌ Script error:", err);
  process.exit(1);
});
