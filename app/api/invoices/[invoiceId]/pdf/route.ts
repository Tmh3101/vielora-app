import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { generateEasyInvoiceAuthHeader } from "@/lib/services/easyinvoice.service";
import { getInvoiceById } from "@/lib/services/invoice.service";
import { EInvoiceStatus } from "@/types/enums";
import { verifyInvoiceToken } from "@/lib/helpers/invoice-token";
import { UUID_REGEX } from "@/lib/utils/uuid";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { invoiceId: string } }) {
  const { invoiceId } = params;

  try {
    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoice id." }, { status: 400 });
    }

    if (!UUID_REGEX.test(invoiceId)) {
      return NextResponse.json({ error: "Invalid invoice id format." }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Authorize: signed token (email link) OR logged-in user
    const { searchParams } = new URL(_request.url);
    const token = searchParams.get("token");
    const exp = parseInt(searchParams.get("exp") || "", 10);
    const hasValidToken = !!(token && exp && verifyInvoiceToken(invoiceId, token, exp));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!hasValidToken && !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Use admin client to bypass RLS for both logged-in and token-based access
    const admin = createAdminClient();
    const invoice = await getInvoiceById(admin, invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice record not found." }, { status: 404 });
    }

    // Logged-in user must own the invoice if no valid token is provided
    if (!hasValidToken && user && user.id !== invoice.user_id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    if (
      invoice.status !== EInvoiceStatus.Issued ||
      !invoice.provider_lookup_code ||
      !invoice.provider_pattern
    ) {
      return NextResponse.json(
        { error: "Invoice is not issued yet or lacks lookup metadata." },
        { status: 400 }
      );
    }

    const baseUrl = process.env.EASYINVOICE_API_BASE_URL || "https://api.easyinvoice.vn";
    const username = process.env.EASYINVOICE_USERNAME;
    const password = process.env.EASYINVOICE_PASSWORD;
    const sellerTaxCode = process.env.EASYINVOICE_TAX_CODE;

    if (!username || !password || !sellerTaxCode) {
      return NextResponse.json({ error: "Server integration is not configured." }, { status: 500 });
    }

    const authHeader = generateEasyInvoiceAuthHeader("POST", username, password, sellerTaxCode);

    const response = await fetch(`${baseUrl}/api/publish/getInvoicePdfByFkey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authentication: authHeader,
      },
      body: JSON.stringify({
        Fkey: invoice.provider_lookup_code,
        Pattern: invoice.provider_pattern,
        Option: 0,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch PDF from invoice provider." },
        { status: 502 }
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
