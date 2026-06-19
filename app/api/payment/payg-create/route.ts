import { NextRequest, NextResponse } from "next/server";
import payos from "@/lib/payos";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import {
  EPaymentStatus,
  EPaymentType,
  EPaymentProvider,
  EPaymentCurrency,
  CreditPackagePrice,
} from "@/types";
import {
  getPendingPayOSPaymentsByUser,
  updatePaymentStatus,
  createPaymentRecord,
} from "@/lib/services/payment.service";
import { getCreditPackageById } from "@/lib/services/credit.service";
import { PAYMENT_LINK_EXPIRATION_SECONDS } from "@/config";
import {
  getPayOSCancelUrl,
  getPayOSReturnUrl,
  getPaymentAmount,
  generateOrderCode,
} from "@/lib/helpers/payos-helpers";

export interface PaygCreateRequestBody {
  packageId: string;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const { packageId } = (await request.json()) as PaygCreateRequestBody;
    if (!packageId) {
      return NextResponse.json({ error: "Missing packageId" }, { status: 400 });
    }

    const creditPackage = await getCreditPackageById(supabase, packageId);
    if (!creditPackage) {
      return NextResponse.json({ error: "Package not found or inactive" }, { status: 404 });
    }

    const priceObj = creditPackage.price as CreditPackagePrice;
    const amount = priceObj?.VND;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid package price." }, { status: 400 });
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
        await updatePaymentStatus(supabase, pending.id, EPaymentStatus.Failed);
      }
    }

    // Create a numeric order code for PayOS
    const orderCode = generateOrderCode();
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

    // Build PayOS payment link
    const paymentAmount = getPaymentAmount(amount);
    const expiredAt = Math.floor(Date.now() / 1000) + PAYMENT_LINK_EXPIRATION_SECONDS; // Payment link expires after 15 minutes
    const requestData = {
      orderCode,
      amount: paymentAmount,
      description: `Nap ${creditPackage.credits_amount} credits`.slice(0, 25),
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
    console.error("PAYG Payment creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
