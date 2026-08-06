import { NextRequest, NextResponse } from "next/server";
import payos from "@/lib/payos";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import {
  EPaymentStatus,
  EPaymentType,
  EPaymentProvider,
  EPaymentCurrency,
  EInvoiceStatus,
  EInvoiceProvider,
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
import { validateInvoiceFields } from "@/lib/utils/invoice-validation";

export interface PaygCreateRequestBody {
  packageId: string;
  quantity?: number;
  requestInvoice?: boolean;
  workspaceId?: string;
  invoice?: {
    companyName: string;
    companyTaxCode: string;
    companyAddress: string;
    recipientEmail: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const body = (await request.json()) as PaygCreateRequestBody;
    const {
      packageId,
      quantity: rawQuantity,
      requestInvoice = false,
      invoice,
      workspaceId: bodyWorkspaceId,
    } = body;

    const workspaceId: string | null =
      bodyWorkspaceId ||
      request.headers.get("x-workspace-id") ||
      request.cookies.get("active_workspace_id")?.value ||
      null;

    if (!packageId) {
      return NextResponse.json({ error: "Missing packageId" }, { status: 400 });
    }

    const quantity = Math.max(1, Math.floor(Number(rawQuantity) || 1));

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

    const creditPackage = await getCreditPackageById(supabase, packageId);
    if (!creditPackage) {
      return NextResponse.json({ error: "Package not found or inactive" }, { status: 404 });
    }

    const priceObj = creditPackage.price as CreditPackagePrice;
    const unitPrice = priceObj?.VND;
    if (!unitPrice || unitPrice <= 0) {
      return NextResponse.json({ error: "Invalid package price." }, { status: 400 });
    }

    const totalCredits = creditPackage.credits_amount * quantity;
    const totalAmount = unitPrice * quantity;

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
        await updatePaymentStatus(supabase, pending.id, EPaymentStatus.Failed);
      }
    }

    // Create a numeric order code for PayOS
    const orderCode = generateOrderCode();
    const payment = await createPaymentRecord(supabase, {
      user_id: user.id,
      workspace_id: workspaceId,
      amount: totalAmount,
      currency: EPaymentCurrency.VND,
      status: EPaymentStatus.Pending,
      payment_type: EPaymentType.PayAsYouGo,
      provider: EPaymentProvider.PayOS,
      provider_transaction_id: String(orderCode),
      metadata: {
        packageId: creditPackage.id,
        packageName: creditPackage.name,
        credits: totalCredits,
        quantity,
        requestInvoice: Boolean(invoiceData),
      },
    });

    console.log("Created PAYG payment record:", payment);

    if (invoiceData) {
      console.log("[InvoiceCreate] Creating invoice row for PAYG payment:", payment.id, {
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
            name: `Nạp Credit Vielora - ${creditPackage.name}`,
            code: `CREDIT_${creditPackage.id.slice(0, 8).toUpperCase()}`,
            quantity,
            unit: "Gói",
            amount: totalAmount,
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

      console.log("[InvoiceCreate] Invoice row created successfully for PAYG payment:", payment.id);
    }

    // Build PayOS payment link
    const paymentAmount = getPaymentAmount(totalAmount);
    const expiredAt = Math.floor(Date.now() / 1000) + PAYMENT_LINK_EXPIRATION_SECONDS;
    const requestData = {
      orderCode,
      amount: paymentAmount,
      description: `Mua ${totalCredits} credits`.slice(0, 25),
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
