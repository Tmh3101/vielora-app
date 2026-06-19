import { NextRequest, NextResponse } from "next/server";
import { handlePaymentSuccess, mergePaymentMetadata } from "@/lib/services/payment.service";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getPaymentResultUrl,
  getPaymentSuccessRedirectUrl,
  getPaymentFailedRedirectUrl,
} from "@/lib/helpers/payos-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const paymentId = url.searchParams.get("paymentId");
    const code = url.searchParams.get("code");
    const id = url.searchParams.get("id");
    const cancel = url.searchParams.get("cancel");
    const status = url.searchParams.get("status");
    const orderCode = url.searchParams.get("orderCode");

    if (!paymentId) {
      return NextResponse.redirect(getPaymentFailedRedirectUrl("missing_ref"));
    }

    if (cancel === "true" || code === "1") {
      return NextResponse.redirect(getPaymentFailedRedirectUrl("24"));
    }

    const supabase = createAdminClient();
    await mergePaymentMetadata(supabase, paymentId, {
      payos_return: { code, id, cancel, status, orderCode },
    });

    // Call service to process successfully. (In PayOS, they provide "code=00" on success normally)
    if (code === "00") {
      try {
        await handlePaymentSuccess(supabase, paymentId);
        return NextResponse.redirect(getPaymentSuccessRedirectUrl(paymentId));
      } catch (error) {
        console.error("Error processing payment success:", error);
        return NextResponse.redirect(
          getPaymentResultUrl({
            status: "success",
            paymentId,
            warning: "processing_delayed",
          })
        );
      }
    }

    return NextResponse.redirect(getPaymentFailedRedirectUrl("server_error"));
  } catch (error) {
    console.error("PayOS return URL error:", error);
    return NextResponse.redirect(getPaymentFailedRedirectUrl("server_error"));
  }
}
