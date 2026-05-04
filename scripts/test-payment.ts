import { handlePaymentSuccess } from "@/lib/services/payment.service";
import { createAdminClient } from "@/lib/supabase/server";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testPayment() {
  const paymentId = process.argv[2];
  if (!paymentId) {
    console.error("❌ Vui lòng cung cấp payment_id. Ví dụ:");
    console.error("npx tsx scripts/test-payment.ts <payment_id>");
    return;
  }

  console.log(`=== Bắt đầu test Payment Success cho ID: ${paymentId} ===`);
  const adminClient = createAdminClient();

  try {
    const result = await handlePaymentSuccess(adminClient, paymentId);
    console.log("✅ Kết quả:", result);
    console.log("Kiểm tra hộp thư để xem email Xác nhận thanh toán.");
  } catch (err) {
    console.error("❌ Lỗi:", err);
  }
}

testPayment();
