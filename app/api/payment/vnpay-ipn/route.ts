import { NextRequest, NextResponse } from "next/server";
import vnpay from "@/lib/vnpay";
import {
  handlePaymentSuccess,
  getPaymentById,
  updatePaymentProviderTxnId,
  updatePaymentStatus,
} from "@/lib/services/payment.service";
import { createAdminClient } from "@/lib/supabase/server";
import type { ReturnQueryFromVNPay } from "vnpay";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams) as unknown as ReturnQueryFromVNPay;

    // 1. Verify the IPN call signature
    const verify = vnpay.verifyIpnCall(query);

    if (!verify.isVerified) {
      return NextResponse.json({ RspCode: "97", Message: "Checksum failed" }, { status: 200 });
    }

    const paymentId = query.vnp_TxnRef;
    const vnpTransactionNo = query.vnp_TransactionNo;
    const vnpAmount = Number(query.vnp_Amount) / 100; // VNPay sends amount * 100

    if (!paymentId) {
      return NextResponse.json({ RspCode: "01", Message: "Order not found" }, { status: 200 });
    }

    // 2. Look up the payment in DB
    const supabase = createAdminClient();
    const payment = await getPaymentById(supabase, paymentId);

    if (!payment) {
      return NextResponse.json({ RspCode: "01", Message: "Order not found" }, { status: 200 });
    }

    // 3. Check if already processed (idempotent)
    if (payment.status === "completed") {
      return NextResponse.json(
        { RspCode: "02", Message: "Order already confirmed" },
        { status: 200 }
      );
    }

    // 4. Validate amount matches
    if (payment.amount !== vnpAmount) {
      return NextResponse.json({ RspCode: "04", Message: "Invalid amount" }, { status: 200 });
    }

    // 5. Update provider_transaction_id
    await updatePaymentProviderTxnId(
      supabase,
      paymentId,
      vnpTransactionNo ? String(vnpTransactionNo) : null
    );

    if (verify.isSuccess) {
      // 6. Payment successful — process business logic
      try {
        await handlePaymentSuccess(supabase, paymentId);
        return NextResponse.json({ RspCode: "00", Message: "Confirm Success" }, { status: 200 });
      } catch (error) {
        console.error("IPN handlePaymentSuccess error:", error);
        return NextResponse.json({ RspCode: "99", Message: "Unknown error" }, { status: 200 });
      }
    } else {
      // 7. Payment failed — update status
      await updatePaymentStatus(supabase, paymentId, "failed");

      return NextResponse.json({ RspCode: "00", Message: "Confirm Success" }, { status: 200 });
    }
  } catch (error) {
    console.error("VNPay IPN error:", error);
    return NextResponse.json({ RspCode: "99", Message: "Unknown error" }, { status: 200 });
  }
}
