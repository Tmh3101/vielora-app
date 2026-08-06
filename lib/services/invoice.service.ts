import type { Tables } from "@/lib/supabase/types";
import type { ServiceClient } from "@/lib/services/types";

// ============ Types ============

export type InvoicePdfRow = Pick<
  Tables<"invoices">,
  "provider_lookup_code" | "provider_pattern" | "user_id" | "status"
>;

export type InvoiceDownloadRow = Pick<
  Tables<"invoices">,
  "provider_lookup_code" | "provider_pattern" | "provider_invoice_no" | "user_id" | "status"
>;

export type InvoiceByPaymentRow = Pick<
  Tables<"invoices">,
  "id" | "status" | "provider_invoice_no" | "provider_lookup_code" | "error_message"
>;

// ============ Queries ============

/**
 * Lấy thông tin invoice cho endpoint PDF (cần provider_lookup_code, provider_pattern).
 * Dùng admin client để bypass RLS.
 */
export async function getInvoiceById(
  client: ServiceClient,
  invoiceId: string
): Promise<InvoicePdfRow | null> {
  const { data, error } = await client
    .from("invoices")
    .select("provider_lookup_code, provider_pattern, user_id, status")
    .eq("id", invoiceId)
    .single();

  if (error || !data) return null;

  return data as unknown as InvoicePdfRow;
}

/**
 * Lấy thông tin invoice cho endpoint download (cần thêm provider_invoice_no).
 * Dùng server client với RLS.
 */
export async function getInvoiceByIdForDownload(
  client: ServiceClient,
  invoiceId: string
): Promise<InvoiceDownloadRow | null> {
  const { data, error } = await client
    .from("invoices")
    .select("provider_lookup_code, provider_pattern, provider_invoice_no, user_id, status")
    .eq("id", invoiceId)
    .single();

  if (error || !data) return null;

  return data as unknown as InvoiceDownloadRow;
}

/**
 * Lấy thông tin invoice theo paymentId và userId (dùng cho trang kết quả thanh toán).
 * Trả về null nếu không tìm thấy.
 */
export async function getInvoiceByPaymentId(
  client: ServiceClient,
  paymentId: string,
  userId: string
): Promise<InvoiceByPaymentRow | null> {
  const { data, error } = await client
    .from("invoices")
    .select("id, status, provider_invoice_no, provider_lookup_code, error_message")
    .eq("payment_id", paymentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) return null;

  return data as unknown as InvoiceByPaymentRow;
}
