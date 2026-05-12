import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import payos from "@/lib/payos";
import { EPaymentStatus, EPaymentType, EPaymentProvider, EPaymentCurrency } from "@/types/enums";
import {
  getPendingPayOSPaymentsByUser,
  updatePaymentStatus,
  createPaymentRecord,
} from "@/lib/services/payment.service";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user via Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createAdminClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { packageId } = body as { packageId: string };

    if (!packageId) {
      return NextResponse.json({ error: "Missing packageId" }, { status: 400 });
    }

    // 3. Fetch credit package from DB
    const { data: creditPackage, error: packageError } = await supabase
      .from("credit_packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true)
      .maybeSingle();

    if (packageError || !creditPackage) {
      return NextResponse.json({ error: "Package not found or inactive" }, { status: 404 });
    }

    const amount = creditPackage.price;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid package price." }, { status: 400 });
    }

    // 4. Cancel all existing pending PayOS payments for this user
    const pendingPayments = await getPendingPayOSPaymentsByUser(supabase, user.id);

    if (pendingPayments.length > 0) {
      for (const pending of pendingPayments) {
        // Cancel on PayOS
        if (pending.provider_transaction_id) {
          try {
            await payos.paymentRequests.cancel(
              pending.provider_transaction_id,
              "User created new payment"
            );
          } catch (e) {
            console.log("Failed to cancel PayOS order (may already expired):", e);
          }
        }
        // Update DB
        await updatePaymentStatus(supabase, pending.id, EPaymentStatus.Failed);
      }
    }

    // Create a numeric order code for PayOS (max 53 bytes integer)
    const orderCode = Number(String(Date.now()).slice(-9) + Math.floor(Math.random() * 100));

    // 5. Create payment record in DB
    const payment = await createPaymentRecord(supabase, {
      user_id: user.id,
      amount: amount,
      currency: EPaymentCurrency.VND,
      status: EPaymentStatus.Pending,
      payment_type: EPaymentType.PayAsYouGo,
      provider: EPaymentProvider.PayOS,
      provider_transaction_id: String(orderCode),
      metadata: {
        packageId: creditPackage.id,
        packageName: creditPackage.name,
        credits: creditPackage.credits_amount,
      },
    });

    // 6. Build PayOS payment link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const orderInfo = `Nap ${creditPackage.credits_amount} credits`;

    // Override amount to 2000 VND for testing with real money
    const paymentAmount = process.env.PAYOS_TEST_MODE === "true" ? 2000 : amount;

    // Payment link expires after 15 minutes
    const expiredAt = Math.floor(Date.now() / 1000) + 900;

    const requestData = {
      orderCode,
      amount: paymentAmount,
      description: orderInfo.substring(0, 25),
      cancelUrl: `${appUrl}/api/payment/payos-cancel?paymentId=${payment.id}`,
      returnUrl: `${appUrl}/api/payment/payos-return?paymentId=${payment.id}`,
      expiredAt,
    };

    const paymentLinkRes = await payos.paymentRequests.create(requestData);

    return NextResponse.json({
      paymentUrl: paymentLinkRes.checkoutUrl,
      paymentId: payment.id,
      returnUrl: requestData.returnUrl,
    });
  } catch (error) {
    console.error("PAYG Payment creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
