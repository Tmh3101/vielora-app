import { NextRequest, NextResponse } from "next/server";
import payos from "@/lib/payos";
import {
  ESubscriptionCycle,
  EPaymentStatus,
  EPaymentType,
  EPaymentProvider,
  EPaymentCurrency,
  ESubscriptionStatus,
  EInvoiceStatus,
  EInvoiceProvider,
  ESubscriptionPlan,
  PlanPrice,
} from "@/types";
import { getPlanByCodeServer } from "@/lib/services/plan.service";
import { getSubscriptionByWorkspaceId } from "@/lib/services/subscription.service";
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
import { validateInvoiceFields } from "@/lib/utils/invoice-validation";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const body = await request.json();
    const {
      planCode,
      billingCycle,
      action = PaymentAction.Upgrade,
      requestInvoice = false,
      invoice,
      workspaceId: bodyWorkspaceId,
    } = body;

    const workspaceId: string | null =
      bodyWorkspaceId ||
      request.headers.get("x-workspace-id") ||
      request.cookies.get("active_workspace_id")?.value ||
      null;

    if (!planCode || !billingCycle) {
      return NextResponse.json({ error: "Missing planCode or billingCycle" }, { status: 400 });
    }

    let invoiceData:
      | {
          companyName: string;
          companyTaxCode: string;
          companyAddress: string;
          recipientEmail: string;
        }
      | undefined;

    if (requestInvoice) {
      const validation = validateInvoiceFields(invoice ?? {});
      if (!validation.valid || !validation.data) {
        return NextResponse.json(
          {
            error: "Thông tin xuất hóa đơn không hợp lệ",
            fieldErrors: validation.errors,
          },
          { status: 400 }
        );
      }
      invoiceData = validation.data;
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

    const customBots = body.botsLimit ?? body.bots_limit;
    const customCredits = body.monthlyCredits ?? body.monthly_credits;
    const deltaBotsInput = body.deltaBots ?? body.delta_bots;
    const deltaCreditsInput = body.deltaCredits ?? body.delta_credits;
    const isIncrementalUpgrade = Boolean(
      body.isIncrementalUpgrade || deltaBotsInput || deltaCreditsInput
    );

    let selectedBots: number | null = null;
    let selectedCredits: number | null = null;
    let amount: number | undefined;
    let deltaBots = 0;
    let deltaCredits = 0;
    let remainingMonths = 1;

    const currentSub = workspaceId
      ? await getSubscriptionByWorkspaceId(supabase, workspaceId)
      : null;

    if (plan.code === ESubscriptionPlan.Enterprise) {
      const {
        calculateEnterprisePrice,
        calculateEnterpriseUpgradePrice,
        ENTERPRISE_PRICE,
        clampValue,
      } = await import("@/config/pricing-enterprise");
      const { calculateRemainingMonths } = await import("@/lib/helpers/payment-helpers");

      const isCurrentSubEnterprise =
        currentSub &&
        currentSub.status === ESubscriptionStatus.Active &&
        currentSub.plan_id === plan.id;

      if (isCurrentSubEnterprise && action === PaymentAction.Renew) {
        // Enforce same cycle renewal
        if (currentSub.billing_cycle && billingCycle !== currentSub.billing_cycle) {
          const expectedCycleLabel =
            currentSub.billing_cycle === ESubscriptionCycle.Monthly ? "Tháng" : "Năm";
          return NextResponse.json(
            {
              error: `Không thể gia hạn khác chu kỳ. Gói hiện tại của bạn là chu kỳ ${expectedCycleLabel}.`,
            },
            { status: 400 }
          );
        }
        selectedBots = currentSub.bots_limit_override ?? ENTERPRISE_PRICE.bots.min;
        selectedCredits =
          currentSub.monthly_credits_override ?? ENTERPRISE_PRICE.monthlyCredits.min;
        amount = calculateEnterprisePrice(
          selectedBots,
          selectedCredits,
          billingCycle as ESubscriptionCycle
        );
      } else if (isCurrentSubEnterprise && isIncrementalUpgrade) {
        deltaBots = Math.max(0, Number(deltaBotsInput || 0));
        deltaCredits = Math.max(0, Number(deltaCreditsInput || 0));
        if (deltaBots <= 0 && deltaCredits <= 0) {
          return NextResponse.json(
            { error: "Vui lòng chọn số lượng bot hoặc credit cần nâng cấp bổ sung." },
            { status: 400 }
          );
        }
        const activeCycle = (currentSub.billing_cycle as ESubscriptionCycle) || billingCycle;
        remainingMonths = calculateRemainingMonths(currentSub.current_period_end);
        amount = calculateEnterpriseUpgradePrice(
          deltaBots,
          deltaCredits,
          activeCycle,
          remainingMonths
        );
      } else {
        // First-time Enterprise registration or normal plan change
        selectedBots = clampValue(
          Number(customBots || ENTERPRISE_PRICE.bots.min),
          ENTERPRISE_PRICE.bots.min,
          ENTERPRISE_PRICE.bots.max
        );
        selectedCredits = clampValue(
          Number(customCredits || ENTERPRISE_PRICE.monthlyCredits.min),
          ENTERPRISE_PRICE.monthlyCredits.min,
          ENTERPRISE_PRICE.monthlyCredits.max
        );
        amount = calculateEnterprisePrice(
          selectedBots,
          selectedCredits,
          billingCycle as ESubscriptionCycle
        );
      }
    } else {
      // Get price from plan pricing
      const pricing = plan.pricing as unknown as PlanPrice | null;
      amount = pricing?.VND?.[billingCycle];
    }

    if (amount === undefined || amount < 0) {
      return NextResponse.json(
        { error: "Plan price invalid. Cannot create payment." },
        { status: 400 }
      );
    }

    if (
      currentSub?.plan_id === plan.id &&
      action !== PaymentAction.Renew &&
      plan.code !== ESubscriptionPlan.Enterprise
    ) {
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
      !isIncrementalUpgrade &&
      currentSub &&
      currentSub.status === ESubscriptionStatus.Active
    ) {
      prorationDiscount = await calculateCreditBasedProration(supabase, user.id, workspaceId);
      amount = amount - prorationDiscount;
    }

    // Cancel all existing pending PayOS payments for this user
    const pendingPayments = await getPendingPayOSPaymentsByUser(supabase, user.id, workspaceId);
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
      workspace_id: workspaceId,
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
        requestInvoice: Boolean(invoiceData),
        ...(isIncrementalUpgrade
          ? { isIncrementalUpgrade: true, deltaBots, deltaCredits, remainingMonths }
          : {}),
        ...(selectedBots ? { bots: selectedBots } : {}),
        ...(selectedCredits ? { credits: selectedCredits } : {}),
      },
    });

    console.log("Created payment record:", payment);

    if (invoiceData) {
      console.log("[InvoiceCreate] Creating invoice row for payment:", payment.id, {
        company: invoiceData.companyName,
        taxCode: invoiceData.companyTaxCode,
        email: invoiceData.recipientEmail,
      });

      const { error: invoiceInsertError } = await supabase.from("invoices").insert({
        payment_id: payment.id,
        user_id: user.id,
        company_name: invoiceData.companyName,
        company_tax_code: invoiceData.companyTaxCode,
        company_address: invoiceData.companyAddress,
        recipient_email: invoiceData.recipientEmail,
        status: EInvoiceStatus.Pending,
        provider: EInvoiceProvider.EasyInvoice,
        line_items: [
          {
            name: `Bản quyền phần mềm Vielora - Gói ${plan.name}`,
            code: `SUB_${plan.code.toUpperCase()}`,
            quantity: 1,
            unit: "Gói",
            amount: Math.max(0, amount),
            billingCycle,
            action,
          },
        ],
      });

      if (invoiceInsertError) {
        console.error(
          "[InvoiceCreate] Insert FAILED:",
          invoiceInsertError.message,
          invoiceInsertError.code
        );
        await updatePaymentStatus(supabase, payment.id, EPaymentStatus.Failed);
        return NextResponse.json(
          { error: "Không thể tạo yêu cầu xuất hóa đơn. Vui lòng thử lại." },
          { status: 500 }
        );
      }

      console.log("[InvoiceCreate] Invoice row created successfully for payment:", payment.id);
    }
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
        `Mua goi ${plan.name} - ${billingCycle === ESubscriptionCycle.Monthly ? "thang" : "nam"}`.substring(
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
