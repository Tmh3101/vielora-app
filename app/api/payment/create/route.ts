import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import vnpay from "@/lib/vnpay";
import { ProductCode, VnpLocale } from "vnpay";
import {
  ESubscriptionPlan,
  ESubscriptionCycle,
  EPaymentCurrency,
  EPaymentType,
  EPaymentStatus,
  EPaymentProvider,
} from "@/types";
import { getPlanByCodeServer } from "@/lib/services/plan.service";
import { getSubscriptionByUserIdServer } from "@/lib/services/subscription.service";
import { createPaymentRecord } from "@/lib/services/payment.service";

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

    if (![ESubscriptionCycle.Monthly, ESubscriptionCycle.Yearly].includes(billingCycle)) {
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

    // 6. Create payment record in DB
    const payment = await createPaymentRecord(supabase, {
      user_id: user.id,
      amount: amount,
      currency: EPaymentCurrency.VND,
      status: EPaymentStatus.Pending,
      payment_type: EPaymentType.Subscription,
      provider: EPaymentProvider.VNPAY,
      plan_id: plan.id,
      metadata: {
        cycle: billingCycle,
        planCode: plan.code,
        planName: plan.name,
      },
    });

    // 7. Get client IP
    const ipAddr =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    // 8. Build VNPay payment URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Remove diacritics for VNPay compatibility
    const orderInfo = `Nang cap goi ${plan.name} - ${billingCycle === ESubscriptionCycle.Monthly ? "thang" : "nam"}`;

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: payment.id,
      vnp_OrderInfo: orderInfo,
      vnp_ReturnUrl: `${appUrl}/api/payment/vnpay-return`,
      vnp_Locale: VnpLocale.VN,
      vnp_OrderType: ProductCode.Pay,
    });

    return NextResponse.json({ paymentUrl, paymentId: payment.id });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
