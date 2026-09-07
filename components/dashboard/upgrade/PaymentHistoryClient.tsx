"use client";

import { useTranslations } from "next-intl";
import { Download, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PaymentHistoryItem } from "@/lib/services/payment-history.service";
import { formatPaymentDate, getPaymentStatusMeta, getPaymentTypeLabel } from "@/lib/helpers";
import { formatVND } from "@/lib/utils/currency";
import { getInvoiceStatusMeta } from "@/lib/utils/invoice-validation";
import { EInvoiceStatus } from "@/types/enums";

interface PaymentHistoryClientProps {
  paymentHistory: PaymentHistoryItem[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

function formatCreditsAdded(credits: number): string {
  return credits > 0 ? `+${credits.toLocaleString()} credits` : "—";
}

function getVisiblePages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visiblePages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return visiblePages.reduce<Array<number | "ellipsis">>((items, page, index) => {
    if (index > 0 && page - visiblePages[index - 1] > 1) {
      items.push("ellipsis");
    }
    items.push(page);
    return items;
  }, []);
}

function InvoiceStatusCell({
  payment,
  t,
}: {
  payment: PaymentHistoryItem;
  t: (key: string) => string;
}) {
  if (!payment.invoice) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const invoiceMeta = getInvoiceStatusMeta(payment.invoice.status);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1.5">
        <Badge
          variant="outline"
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium ${invoiceMeta.className}`}
        >
          {invoiceMeta.label}
        </Badge>
        {invoiceMeta.canDownload && (
          <a
            href={`/api/invoices/${payment.invoice.id}/download`}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            title={t("downloadInvoice")}
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {payment.invoice.status === EInvoiceStatus.Failed && payment.invoice.error_message && (
        <p className="max-w-[200px] text-right text-[11px] text-red-600">
          {payment.invoice.error_message}
        </p>
      )}
    </div>
  );
}

export function PaymentHistoryClient({
  paymentHistory,
  currentPage,
  pageSize,
  totalItems,
}: PaymentHistoryClientProps) {
  const t = useTranslations("dashboard.upgrade");
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageItems = getVisiblePages(currentPage, totalPages);
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-foreground">{t("paymentHistoryTitle")}</h2>
        <p className="mt-2 text-muted-foreground">{t("paymentHistoryDesc")}</p>
      </div>

      <Card className="border-border/60 bg-card/60 shadow-sm">
        <CardContent className="p-0">
          {paymentHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{t("noTransactions")}</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {t("noTransactionsDesc")}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">{t("colDate")}</TableHead>
                      <TableHead className="text-xs font-semibold">{t("colPayer")}</TableHead>
                      <TableHead className="text-xs font-semibold">{t("colType")}</TableHead>
                      <TableHead className="text-right text-xs font-semibold">
                        {t("colAmount")}
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold">
                        {t("colCredits")}
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold">
                        {t("colStatus")}
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold">
                        {t("colInvoice")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => {
                      const statusMeta = getPaymentStatusMeta(payment.status);
                      const StatusIcon = statusMeta.icon;

                      return (
                        <TableRow key={payment.id} className="py-2">
                          <TableCell className="text-[11px] font-medium text-muted-foreground">
                            {formatPaymentDate(payment.created_at)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                {payment.payerName || payment.payerEmail || "—"}
                              </p>
                              {payment.payerName && payment.payerEmail && (
                                <p className="text-[11px] text-muted-foreground">
                                  {payment.payerEmail}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-foreground">
                            {getPaymentTypeLabel(payment)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-foreground">
                            {formatVND(payment.amount)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-primary">
                            {formatCreditsAdded(payment.credits_added)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium ${statusMeta.className}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusMeta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <InvoiceStatusCell payment={payment} t={t} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="divide-y divide-border/60 md:hidden">
                {paymentHistory.map((payment) => {
                  const statusMeta = getPaymentStatusMeta(payment.status);
                  const StatusIcon = statusMeta.icon;
                  const invoiceMeta = getInvoiceStatusMeta(payment.invoice?.status);

                  return (
                    <div key={payment.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">
                            {getPaymentTypeLabel(payment)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatPaymentDate(payment.created_at)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`inline-flex shrink-0 items-center gap-1.5 ${statusMeta.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusMeta.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("mobilePayer")}</span>
                        <span className="font-medium text-foreground">
                          {payment.payerName || payment.payerEmail || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("mobileAmount")}</span>
                        <span className="font-semibold text-foreground">
                          {formatVND(payment.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Credits</span>
                        <span className="font-semibold text-primary">
                          {formatCreditsAdded(payment.credits_added)}
                        </span>
                      </div>
                      {payment.invoice && (
                        <div className="space-y-2 rounded-lg border border-border/60 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-muted-foreground">
                              {t("mobileInvoice")}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`inline-flex items-center gap-1.5 ${invoiceMeta.className}`}
                              >
                                {invoiceMeta.label}
                              </Badge>
                              {invoiceMeta.canDownload && (
                                <a
                                  href={`/api/invoices/${payment.invoice.id}/download`}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          </div>
                          {payment.invoice.status === EInvoiceStatus.Failed &&
                            payment.invoice.error_message && (
                              <p className="text-xs text-red-600">
                                {payment.invoice.error_message}
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {totalItems > 0 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {t("paginationInfo", {
              first: firstItem.toLocaleString(),
              last: lastItem.toLocaleString(),
              total: totalItems.toLocaleString(),
            })}
          </p>

          {totalPages > 1 && (
            <Pagination className="ml-auto w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={`/dashboard/upgrade/history?page=${Math.max(1, currentPage - 1)}`}
                    aria-disabled={currentPage === 1}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "border border-background hover:bg-background hover:text-primary"
                    }
                  />
                </PaginationItem>

                {pageItems.map((page, index) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href={`/dashboard/upgrade/history?page=${page}`}
                        isActive={page === currentPage}
                        className={
                          page === currentPage
                            ? "border border-primary bg-background text-primary hover:bg-background hover:text-primary"
                            : "border border-background hover:bg-background hover:text-primary"
                        }
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    href={`/dashboard/upgrade/history?page=${Math.min(totalPages, currentPage + 1)}`}
                    aria-disabled={currentPage === totalPages}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "border border-background hover:bg-background hover:text-primary"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}
