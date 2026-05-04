import { NextRequest, NextResponse } from "next/server";
import payos from "@/lib/payos";
import {
  handlePaymentSuccess,
  getPaymentByProviderTxnId,
  updatePaymentStatus,
} from "@/lib/services/payment.service";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const webhookData = await payos.webhooks.verify(body);
    const orderCode = webhookData.orderCode;
    const supabase = createAdminClient();

    if (webhookData.code === "00") {
      const payment = await getPaymentByProviderTxnId(supabase, String(orderCode));

      if (payment && payment.status === "pending") {
        await handlePaymentSuccess(supabase, payment.id);
      }
    } else {
      const payment = await getPaymentByProviderTxnId(supabase, String(orderCode));
      if (payment && payment.status === "pending") {
        await updatePaymentStatus(supabase, payment.id, "failed");
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PayOS webhook error:", error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
