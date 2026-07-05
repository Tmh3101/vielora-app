import { NextRequest, NextResponse } from "next/server";
import vnpay from "@/lib/vnpay";
import {
  handlePaymentSuccess,
  mergePaymentMetadata,
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 1. Verify the return URL signature
    const verify = vnpay.verifyReturnUrl(query);

    if (!verify.isVerified) {
      // Signature invalid — possibly tampered
      return NextResponse.redirect(
        `${appUrl}/dashboard/payment/result?status=failed&reason=invalid_signature`
      );
    }

    const paymentId = query.vnp_TxnRef;
    const vnpResponseCode = query.vnp_ResponseCode;
    const vnpTransactionNo = query.vnp_TransactionNo;

    if (!paymentId) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/payment/result?status=failed&reason=missing_ref`
      );
    }

    // 2. Update provider_transaction_id and merge VNPay response into metadata
    const supabase = createAdminClient();

    // Update provider_transaction_id
    await updatePaymentProviderTxnId(
      supabase,
      paymentId,
      vnpTransactionNo ? String(vnpTransactionNo) : null
    );

    // Merge VNPay response into metadata
    await mergePaymentMetadata(supabase, paymentId, { vnpay_response: query });

    if (verify.isSuccess) {
      // 3. Payment successful — process business logic
      try {
        await handlePaymentSuccess(supabase, paymentId);

        return NextResponse.redirect(
          `${appUrl}/dashboard/payment/result?status=success&paymentId=${paymentId}`
        );
      } catch (error) {
        console.error("Error processing payment success:", error);
        // Still redirect to success — payment was charged, we'll retry via IPN
        return NextResponse.redirect(
          `${appUrl}/dashboard/payment/result?status=success&paymentId=${paymentId}&warning=processing_delayed`
        );
      }
    } else {
      // 4. Payment failed
      await updatePaymentStatus(supabase, paymentId, "failed");

      return NextResponse.redirect(
        `${appUrl}/dashboard/payment/result?status=failed&code=${vnpResponseCode}&paymentId=${paymentId}`
      );
    }
  } catch (error) {
    console.error("VNPay return URL error:", error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/dashboard/payment/result?status=failed&reason=server_error`
    );
  }
}
