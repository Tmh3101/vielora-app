import { deductCredits } from "@/lib/services/credit.service";
import { createAdminClient } from "@/lib/supabase/server";
import { ETransactionType } from "@/types";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testLowCredits() {
  const userId = process.argv[2];
  const amount = parseInt(process.argv[3] || "10", 10);

  if (!userId) {
    console.error("❌ Vui lòng cung cấp user_id. Ví dụ:");
    console.error("npx tsx scripts/test-low-credits.ts <user_id> [amount]");
    return;
  }

  console.log(`=== Test trừ ${amount} credits cho user: ${userId} ===`);
  const adminClient = createAdminClient();

  try {
    const result = await deductCredits(adminClient, {
      userId,
      creditAmount: amount,
      transactionType: ETransactionType.ChatMessage,
      transactionDescription: "Test deduction from script",
    });

    console.log("✅ Kết quả Deduct:", result);
    console.log(
      "Nếu tổng credits còn lại <= 10% gói, bạn sẽ nhận được email cảnh báo sắp hết credits."
    );
  } catch (err) {
    console.error("❌ Lỗi thao tác:", err);
  }
}

testLowCredits();
