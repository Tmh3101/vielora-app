import { NextRequest, NextResponse } from "next/server";
import payos from "@/lib/payos";
import {
  ESubscriptionCycle,
  EPaymentStatus,
  EPaymentType,
  EPaymentProvider,
  EPaymentCurrency,
  ESubscriptionStatus,
  PlanPrice,
} from "@/types";
import { getPlanByCodeServer } from "@/lib/services/plan.service";
import { getSubscriptionByUserIdServer } from "@/lib/services/subscription.service";
import {
  getPendingPayOSPaymentsByUser,
  updatePaymentStatus,
  createPaymentRecord,
  calculateCreditBasedProration,
  handlePaymentSuccess,
} from "@/lib/services/payment.service";
import { PaymentAction } from "@/lib/constants/payment";
import {
  PAYOS_MIN_AMOUNT_VND,
  MIN_DAYS_LEFT_FOR_RENEWAL_MONTHLY,
  MIN_DAYS_LEFT_FOR_RENEWAL_YEARLY,
} from "@/config/payment";
import {
  generateOrderCode,
  getPayOSSuccessUrl,
  getPayOSCancelUrl,
  getPayOSReturnUrl,
  getPaymentAmount,
} from "@/lib/helpers/payos-helpers";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const { planCode, billingCycle, action = PaymentAction.Upgrade } = await request.json();
    if (!planCode || !billingCycle) {
      return NextResponse.json({ error: "Missing planCode or billingCycle" }, { status: 400 });
    }

    if (!Object.values(ESubscriptionCycle).includes(billingCycle)) {
      return NextResponse.json(
        { error: "Invalid billingCycle. Must be 'monthly' or 'yearly'" },
        { status: 400 }
      );
    }

    const plan = await getPlanByCodeServer(supabase, planCode);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get price from plan pricing
    const pricing = plan.pricing as unknown as PlanPrice | null;
    let amount = pricing?.[billingCycle]?.VND;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "This plan is free. No payment required." },
        { status: 400 }
      );
    }

    const currentSub = await getSubscriptionByUserIdServer(supabase, user.id);
    if (currentSub?.plan_id === plan.id && action !== PaymentAction.Renew) {
      return NextResponse.json({ error: "You are already on this plan" }, { status: 400 });
    }

    if (
      action === PaymentAction.Renew &&
      currentSub &&
      currentSub.status === ESubscriptionStatus.Active
    ) {
      const now = new Date();
      const periodEnd = new Date(currentSub.current_period_end);

      if (periodEnd > now) {
        const daysLeft = (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (
          billingCycle === ESubscriptionCycle.Monthly &&
          daysLeft > MIN_DAYS_LEFT_FOR_RENEWAL_MONTHLY
        ) {
          return NextResponse.json(
            { error: "Không thể gia hạn. Bạn đã có sẵn chu kỳ tiếp theo." },
            { status: 400 }
          );
        } else if (
          billingCycle === ESubscriptionCycle.Yearly &&
          daysLeft > MIN_DAYS_LEFT_FOR_RENEWAL_YEARLY
        ) {
          return NextResponse.json(
            { error: "Không thể gia hạn. Bạn đã có sẵn chu kỳ tiếp theo." },
            { status: 400 }
          );
        }
      }
    }

    let prorationDiscount = 0;
    if (
      action === PaymentAction.Upgrade &&
      currentSub &&
      currentSub.status === ESubscriptionStatus.Active
    ) {
      prorationDiscount = await calculateCreditBasedProration(supabase, user.id);
      amount = amount - prorationDiscount;
    }

    // Cancel all existing pending PayOS payments for this user
    const pendingPayments = await getPendingPayOSPaymentsByUser(supabase, user.id);
    if (pendingPayments.length > 0) {
      for (const pending of pendingPayments) {
        if (pending.provider_transaction_id) {
          try {
            await payos.paymentRequests.cancel(
              pending.provider_transaction_id,
              "User created new payment"
            );
          } catch (e) {
            if (e?.code === "101") {
              console.log(
                `Pending order ${pending.provider_transaction_id} already expired or not found on PayOS.`
              );
            } else {
              console.log("Failed to cancel PayOS order:", e);
            }
          }
        }
        // Update DB
        await updatePaymentStatus(supabase, pending.id, EPaymentStatus.Failed);
      }
    }

    // Create a numeric order code for PayOS
    const orderCode = generateOrderCode();
    const payment = await createPaymentRecord(supabase, {
      user_id: user.id,
      amount: Math.max(0, amount),
      currency: EPaymentCurrency.VND,
      status: EPaymentStatus.Pending,
      payment_type:
        action === PaymentAction.Renew
          ? EPaymentType.SubscriptionRenew
          : EPaymentType.SubscriptionUpgrade,
      provider: EPaymentProvider.PayOS,
      plan_id: plan.id,
      provider_transaction_id: String(orderCode),
      metadata: {
        cycle: billingCycle,
        planCode: plan.code,
        planName: plan.name,
        action: action,
        prorationDiscount,
      },
    });

    console.log("Created payment record:", payment);
    if (amount <= PAYOS_MIN_AMOUNT_VND && action === PaymentAction.Upgrade) {
      await handlePaymentSuccess(supabase, payment.id);
      const successUrl = getPayOSSuccessUrl(payment.id);
      return NextResponse.json({
        paymentUrl: successUrl,
        paymentId: payment.id,
        returnUrl: successUrl,
      });
    }

    const expiredAt = Math.floor(Date.now() / 1000) + 900;
    const requestData = {
      orderCode,
      amount: getPaymentAmount(amount),
      description:
        `Nang cap goi ${plan.name} - ${billingCycle === ESubscriptionCycle.Monthly ? "thang" : "nam"}`.substring(
          0,
          25
        ),
      cancelUrl: getPayOSCancelUrl(payment.id),
      returnUrl: getPayOSReturnUrl(payment.id),
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
