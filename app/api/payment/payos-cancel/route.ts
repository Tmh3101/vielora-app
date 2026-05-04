import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { EPaymentStatus } from "@/types";
import { updatePaymentStatus } from "@/lib/services/payment.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("paymentId");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (paymentId) {
    const supabase = createAdminClient();
    await updatePaymentStatus(supabase, paymentId, EPaymentStatus.Failed);
  }

  return NextResponse.redirect(
    `${appUrl}/dashboard/payment/result?status=failed&code=24` // 24 = User cancelled
  );
}
