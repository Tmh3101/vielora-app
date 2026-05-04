import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import payos from "@/lib/payos";
import { EPaymentStatus } from "@/types";
import { getPaymentById, updatePaymentStatus } from "@/lib/services/payment.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const payment = await getPaymentById(supabase, paymentId);

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Nếu đã xử lý rồi thì bỏ qua (idempotent)
    if (payment.status !== EPaymentStatus.Pending) {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Cố cancel trên PayOS, bỏ qua lỗi nếu đơn đã hết hạn/đã cancel
    if (payment.provider_transaction_id) {
      try {
        await payos.paymentRequests.cancel(
          payment.provider_transaction_id,
          "User cancelled payment"
        );
      } catch (e) {
        // Bỏ qua — đơn có thể đã hết hạn hoặc đã cancel
        const errorCode = e instanceof Error ? (e as Error & { code?: string }).code : undefined;
        console.log("PayOS cancel skipped:", errorCode || e);
      }
    }

    // Luôn cập nhật DB
    await updatePaymentStatus(supabase, payment.id, EPaymentStatus.Failed);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
