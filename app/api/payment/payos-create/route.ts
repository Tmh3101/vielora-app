import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import payos from "@/lib/payos";
import {
  ESubscriptionPlan,
  ESubscriptionCycle,
  EPaymentStatus,
  EPaymentType,
  EPaymentProvider,
  EPaymentCurrency,
} from "@/types";
import { getPlanByCodeServer } from "@/lib/services/plan.service";
import { getSubscriptionByUserIdServer } from "@/lib/services/subscription.service";
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
    const { planCode, billingCycle } = body as {
      planCode: ESubscriptionPlan;
      billingCycle: ESubscriptionCycle;
    };

    if (!planCode || !billingCycle) {
      return NextResponse.json({ error: "Missing planCode or billingCycle" }, { status: 400 });
    }

    if (!Object.values(ESubscriptionCycle).includes(billingCycle)) {
      return NextResponse.json(
        { error: "Invalid billingCycle. Must be 'monthly' or 'yearly'" },
        { status: 400 }
      );
    }

    // 3. Fetch plan from DB (service role to bypass RLS)
    const plan = await getPlanByCodeServer(supabase, planCode);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // 4. Get price from plan pricing
    const pricing = plan.pricing as Record<string, Record<string, number>> | null;
    const amount = pricing?.VND?.[billingCycle];

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "This plan is free. No payment required." },
        { status: 400 }
      );
    }

    // 5. Check if user already has the same active plan
    const currentSub = await getSubscriptionByUserIdServer(supabase, user.id);

    if (currentSub?.plan_id === plan.id) {
      return NextResponse.json({ error: "You are already on this plan" }, { status: 400 });
    }

    // 5.5 Cancel all existing pending PayOS payments for this user
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

    // 6. Create payment record in DB
    const payment = await createPaymentRecord(supabase, {
      user_id: user.id,
      amount: amount,
      currency: EPaymentCurrency.VND,
      status: EPaymentStatus.Pending,
      payment_type: EPaymentType.Subscription,
      provider: EPaymentProvider.PayOS,
      plan_id: plan.id,
      provider_transaction_id: String(orderCode),
      metadata: {
        cycle: billingCycle,
        planCode: plan.code,
        planName: plan.name,
      },
    });

    // 7. Build PayOS payment link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const orderInfo = `Nang cap goi ${plan.name} - ${billingCycle === ESubscriptionCycle.Monthly ? "thang" : "nam"}`;

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
    console.error("Payment creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
