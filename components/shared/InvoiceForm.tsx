"use client";

import { useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, Search, RotateCcw } from "lucide-react";
import { EmailChipsInput } from "@/components/shared/EmailChipsInput";
import {
  validateInvoiceFields,
  normalizeTaxCode,
  TAX_CODE_REGEX,
  TAX_CODE_ERROR,
  MAX_INVOICE_EMAILS,
  type InvoiceFieldErrors,
} from "@/lib/utils/invoice-validation";

export interface InvoiceFormHandle {
  validate: () => boolean;
  getInvoiceData: () => {
    requestInvoice: boolean;
    invoice?: {
      companyName: string;
      companyTaxCode: string;
      companyAddress: string;
      recipientEmail: string;
    };
  };
  setServerErrors: (errors: InvoiceFieldErrors) => void;
}

interface InvoiceFormProps {
  disabled?: boolean;
  userEmail?: string;
}

export const InvoiceForm = forwardRef<InvoiceFormHandle, InvoiceFormProps>(function InvoiceForm(
  { disabled = false, userEmail },
  ref
) {
  const [requestInvoice, setRequestInvoice] = useState(false);
  const [companyTaxCode, setCompanyTaxCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [recipientEmail, setRecipientEmail] = useState(userEmail ?? "");
  const [invoiceErrors, setInvoiceErrors] = useState<InvoiceFieldErrors>({});

  const [isCheckingTax, setIsCheckingTax] = useState(false);
  const [isTaxVerified, setIsTaxVerified] = useState(false);

  const handleCheckTaxCode = useCallback(
    async (codeToCheck?: string) => {
      const targetTaxCode = normalizeTaxCode(codeToCheck ?? companyTaxCode);

      if (!targetTaxCode || !TAX_CODE_REGEX.test(targetTaxCode)) {
        setInvoiceErrors((prev) => ({
          ...prev,
          companyTaxCode: TAX_CODE_ERROR,
        }));
        setIsTaxVerified(false);
        return false;
      }

      setIsCheckingTax(true);
      setInvoiceErrors((prev) => ({ ...prev, companyTaxCode: undefined }));

      try {
        const res = await fetch(`/api/tax-lookup?taxCode=${encodeURIComponent(targetTaxCode)}`);
        const result = await res.json();

        if (res.ok && result.success && result.data) {
          setCompanyName(result.data.companyName);
          setCompanyAddress(result.data.companyAddress);
          setIsTaxVerified(true);
          setInvoiceErrors({});
          setIsCheckingTax(false);
          return true;
        } else {
          setCompanyName("");
          setCompanyAddress("");
          setIsTaxVerified(false);
          setInvoiceErrors((prev) => ({
            ...prev,
            companyTaxCode:
              result.error || "Mã số thuế không tồn tại hoặc doanh nghiệp đã ngừng hoạt động.",
          }));
          setIsCheckingTax(false);
          return false;
        }
      } catch (err) {
        console.error("Tax lookup error:", err);
        setCompanyName("");
        setCompanyAddress("");
        setIsTaxVerified(false);
        setInvoiceErrors((prev) => ({
          ...prev,
          companyTaxCode: "Không thể kết nối dịch vụ tra cứu. Vui lòng thử lại.",
        }));
        setIsCheckingTax(false);
        return false;
      }
    },
    [companyTaxCode]
  );

  const handleTaxCodeChange = (val: string) => {
    setCompanyTaxCode(val);
    if (isTaxVerified) {
      setIsTaxVerified(false);
      setCompanyName("");
      setCompanyAddress("");
    }
    if (invoiceErrors.companyTaxCode) {
      setInvoiceErrors((prev) => ({ ...prev, companyTaxCode: undefined }));
    }
  };

  const handleResetTaxCheck = () => {
    setCompanyTaxCode("");
    setCompanyName("");
    setCompanyAddress("");
    setIsTaxVerified(false);
    setInvoiceErrors({});
  };

  const validate = useCallback((): boolean => {
    if (!requestInvoice) {
      setInvoiceErrors({});
      return true;
    }

    if (!isTaxVerified) {
      setInvoiceErrors((prev) => ({
        ...prev,
        companyTaxCode: "Vui lòng nhấn 'Kiểm tra' để xác thực Mã số thuế trước khi thanh toán.",
      }));
      return false;
    }

    const result = validateInvoiceFields({
      companyName,
      companyTaxCode: normalizeTaxCode(companyTaxCode),
      companyAddress,
      recipientEmail,
    });
    setInvoiceErrors(result.errors);
    return result.valid;
  }, [requestInvoice, isTaxVerified, companyName, companyTaxCode, companyAddress, recipientEmail]);

  const getInvoiceData = useCallback(
    () => ({
      requestInvoice,
      invoice:
        requestInvoice && isTaxVerified
          ? {
              companyName,
              companyTaxCode: normalizeTaxCode(companyTaxCode),
              companyAddress,
              recipientEmail,
            }
          : undefined,
    }),
    [requestInvoice, isTaxVerified, companyName, companyTaxCode, companyAddress, recipientEmail]
  );

  const setServerErrors = useCallback((errors: InvoiceFieldErrors) => {
    setInvoiceErrors(errors);
  }, []);

  useImperativeHandle(ref, () => ({
    validate,
    getInvoiceData,
    setServerErrors,
  }));

  const clearError = (field: keyof InvoiceFieldErrors) => {
    if (invoiceErrors[field]) {
      setInvoiceErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateField = (field: keyof InvoiceFieldErrors) => {
    if (!requestInvoice) return;
    if (field === "recipientEmail") {
      const result = validateInvoiceFields({
        companyName,
        companyTaxCode: normalizeTaxCode(companyTaxCode),
        companyAddress,
        recipientEmail,
      });
      setInvoiceErrors((prev) => ({ ...prev, recipientEmail: result.errors.recipientEmail }));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Thông tin hóa đơn VAT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
          <Checkbox
            id="request-invoice"
            checked={requestInvoice}
            onCheckedChange={(checked) => {
              const enabled = checked === true;
              setRequestInvoice(enabled);
              if (!enabled) {
                setInvoiceErrors({});
                setIsTaxVerified(false);
                setCompanyName("");
                setCompanyAddress("");
              }
            }}
            disabled={disabled}
          />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Xuất hóa đơn VAT cho doanh nghiệp</p>
          </div>
        </div>

        {requestInvoice && (
          <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            {/* Tax Code input + Search Button */}
            <div className="space-y-2">
              <Label htmlFor="company-tax-code">Mã số thuế doanh nghiệp</Label>
              <div className="flex gap-2">
                <Input
                  id="company-tax-code"
                  value={companyTaxCode}
                  onChange={(e) => handleTaxCodeChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCheckTaxCode();
                    }
                  }}
                  placeholder="VD: 0109123456 hoặc 0109123456-001"
                  disabled={disabled || isCheckingTax || isTaxVerified}
                  className="flex-1"
                />
                {!isTaxVerified ? (
                  <Button
                    type="button"
                    onClick={() => handleCheckTaxCode()}
                    disabled={disabled || isCheckingTax || !companyTaxCode.trim()}
                    className="min-w-[32px] bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isCheckingTax ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetTaxCheck}
                    disabled={disabled}
                    className="min-w-[32px] border-muted-foreground/30 hover:border-primary hover:bg-background hover:text-primary"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {invoiceErrors.companyTaxCode && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {invoiceErrors.companyTaxCode}
                </p>
              )}

              {!isTaxVerified && !invoiceErrors.companyTaxCode && (
                <p className="text-xs text-muted-foreground">
                  Nhập Mã số thuế để tự động tra cứu thông tin công ty.
                </p>
              )}
            </div>

            {/* Verified Business Information Card */}
            {isTaxVerified && (
              <div className="space-y-3 rounded-lg border border-primary/30 bg-white p-3.5 dark:border-green-900/40 dark:bg-green-950/20">
                <div className="space-y-2 pt-1 text-sm">
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="text-muted-foreground">Tên doanh nghiệp:</p>
                      <p className="font-semibold text-foreground">{companyName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div>
                      <p className="text-muted-foreground">Địa chỉ đăng ký thuế:</p>
                      <p className="text-xs italic text-foreground/90">{companyAddress}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email List Input (Only visible when verified) */}
            {isTaxVerified && (
              <div className="space-y-2 border-t border-border/40 pt-3">
                <Label htmlFor="recipient-email">Email nhận hóa đơn</Label>
                <EmailChipsInput
                  value={recipientEmail}
                  onChange={(val) => {
                    setRecipientEmail(val);
                    clearError("recipientEmail");
                  }}
                  onBlur={() => validateField("recipientEmail")}
                  maxEmails={MAX_INVOICE_EMAILS}
                  disabled={disabled}
                  placeholder="Nhập email và nhấn Enter"
                />
                <p className="text-xs text-muted-foreground">
                  Tối đa {MAX_INVOICE_EMAILS} email, nhấn Enter hoặc dấu phẩy để thêm.
                </p>
                {invoiceErrors.recipientEmail && (
                  <p className="text-xs font-medium text-red-600">{invoiceErrors.recipientEmail}</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
