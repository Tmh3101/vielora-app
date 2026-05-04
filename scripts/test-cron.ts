import {
  processSubscriptionLifecycle,
  processExpiryReminders,
} from "@/lib/services/subscription-cron.service";
import { createAdminClient } from "@/lib/supabase/server";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testCron() {
  console.log("=== Bắt đầu chạy Test Cron Jobs ===");
  const adminClient = createAdminClient();

  try {
    console.log("\n--- 1. Chạy tiến trình Subscription Lifecycle (Reset/Downgrade) ---");
    const lifecycleResult = await processSubscriptionLifecycle(adminClient);
    console.log("Kết quả Lifecycle:", lifecycleResult);

    console.log("\n--- 2. Chạy tiến trình Expiry Reminders (Nhắc hết hạn) ---");
    const reminderResult = await processExpiryReminders(adminClient);
    console.log("Kết quả Reminders:", reminderResult);

    console.log("\n✅ Hoàn tất! Vui lòng kiểm tra hộp thư nếu có tài khoản thỏa mãn điều kiện.");
  } catch (err) {
    console.error("❌ Lỗi khi chạy cron:", err);
  }
}

testCron();
