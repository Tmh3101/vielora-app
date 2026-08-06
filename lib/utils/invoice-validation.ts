import { EInvoiceStatus } from "@/types/enums";

export const TAX_CODE_REGEX = /^\d{10}(-\d{3})?$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_INVOICE_EMAILS = 5;

export const TAX_CODE_ERROR =
  "Mã số thuế không đúng định dạng (10 số hoặc 13 số cách nhau bởi dấu gạch ngang)";
export const COMPANY_NAME_ERROR = "Vui lòng nhập tên công ty";
export const COMPANY_ADDRESS_ERROR = "Vui lòng nhập địa chỉ công ty";
export const INVOICE_EMAIL_ERROR = "Email nhận hóa đơn không hợp lệ";
export const INVOICE_EMAIL_MAX_ERROR = `Tối đa ${MAX_INVOICE_EMAILS} email nhận hóa đơn`;

export interface InvoiceRequestPayload {
  companyName: string;
  companyTaxCode: string;
  companyAddress: string;
  recipientEmail: string;
}

export interface InvoiceFieldErrors {
  companyTaxCode?: string;
  companyName?: string;
  companyAddress?: string;
  recipientEmail?: string;
}

export function normalizeTaxCode(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

export function parseEmailList(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

export function validateInvoiceFields(input: {
  companyName?: string;
  companyTaxCode?: string;
  companyAddress?: string;
  recipientEmail?: string;
}): { valid: boolean; errors: InvoiceFieldErrors; data?: InvoiceRequestPayload } {
  const companyName = (input.companyName ?? "").trim();
  const companyTaxCode = normalizeTaxCode(input.companyTaxCode ?? "");
  const companyAddress = (input.companyAddress ?? "").trim();
  const recipientEmail = (input.recipientEmail ?? "").trim();

  const errors: InvoiceFieldErrors = {};

  if (!companyTaxCode || !TAX_CODE_REGEX.test(companyTaxCode)) {
    errors.companyTaxCode = TAX_CODE_ERROR;
  }
  if (!companyName) {
    errors.companyName = COMPANY_NAME_ERROR;
  }
  if (!companyAddress) {
    errors.companyAddress = COMPANY_ADDRESS_ERROR;
  }

  if (!recipientEmail) {
    errors.recipientEmail = INVOICE_EMAIL_ERROR;
  } else {
    const emails = parseEmailList(recipientEmail);
    if (emails.length > MAX_INVOICE_EMAILS) {
      errors.recipientEmail = INVOICE_EMAIL_MAX_ERROR;
    } else if (!emails.every((e) => EMAIL_REGEX.test(e))) {
      errors.recipientEmail = INVOICE_EMAIL_ERROR;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      companyName,
      companyTaxCode,
      companyAddress,
      recipientEmail,
    },
  };
}

export function getInvoiceStatusMeta(status: EInvoiceStatus | null | undefined): {
  label: string;
  className: string;
  canDownload: boolean;
} {
  switch (status) {
    case EInvoiceStatus.Pending:
    case EInvoiceStatus.Issuing:
      return {
        label: "Đang xử lý xuất hóa đơn",
        className: "border-yellow-300 bg-yellow-50 text-yellow-700",
        canDownload: false,
      };
    case EInvoiceStatus.Issued:
      return {
        label: "Đã xuất hóa đơn",
        className: "border-green-300 bg-green-50 text-green-700",
        canDownload: true,
      };
    case EInvoiceStatus.Failed:
      return {
        label: "Lỗi xuất hóa đơn",
        className: "border-red-300 bg-red-50 text-red-700",
        canDownload: false,
      };
    default:
      return {
        label: "Không yêu cầu hóa đơn",
        className: "border-border bg-muted/40 text-muted-foreground",
        canDownload: false,
      };
  }
}
