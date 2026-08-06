import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getInvoiceByPaymentId } from "@/lib/services/invoice.service";
import { UUID_REGEX } from "@/lib/utils/uuid";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const paymentId = request.nextUrl.searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
    }

    if (!UUID_REGEX.test(paymentId)) {
      return NextResponse.json({ error: "Invalid paymentId format" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await getInvoiceByPaymentId(supabase, paymentId, user.id);

    if (!invoice) {
      return NextResponse.json({ hasInvoice: false });
    }

    return NextResponse.json({
      hasInvoice: true,
      invoice: {
        id: invoice.id,
        status: invoice.status,
        invoiceNo: invoice.provider_invoice_no,
        lookupCode: invoice.provider_lookup_code,
        errorMessage: invoice.error_message,
      },
    });
  } catch (error) {
    console.error("[InvoiceByPayment] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
