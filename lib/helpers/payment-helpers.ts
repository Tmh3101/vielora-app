import type { PaymentHistoryItem } from "@/lib/services/payment-history.service";
import { EPaymentStatus, EPaymentType } from "@/types";
import { CheckCircle2, Clock3, Receipt, XCircle } from "lucide-react";

export function formatPaymentDate(date: string): string {
  return new Date(date).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export function getPaymentTypeLabel(payment: PaymentHistoryItem): string {
  if (payment.payment_type === EPaymentType.PayAsYouGo) {
    return "PAYG";
  }

  return payment.plan?.name ?? "Standard";
}

export function getPaymentStatusMeta(status: PaymentHistoryItem["status"]) {
  switch (status) {
    case EPaymentStatus.Completed:
      return {
        label: "Thành công",
        icon: CheckCircle2,
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
      };
    case EPaymentStatus.Failed:
      return {
        label: "Thất bại",
        icon: XCircle,
        className: "border-red-500/20 bg-red-500/10 text-red-600",
      };
    case EPaymentStatus.Refunded:
      return {
        label: "Đã hoàn tiền",
        icon: Receipt,
        className: "border-slate-500/20 bg-slate-500/10 text-slate-600",
      };
    case EPaymentStatus.Pending:
    default:
      return {
        label: "Đang xử lý",
        icon: Clock3,
        className: "border-amber-500/20 bg-amber-500/10 text-amber-600",
      };
  }
}
