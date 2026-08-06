import { Worker, Job } from "bullmq";
import { getRedisConnectionOptions } from "@/lib/config/redis";
import { createAdminClient } from "@/lib/supabase/server";
import { publishInvoice, getInvoiceByIkey } from "@/lib/services/easyinvoice.service";
import { sendInvoiceIssuedEmail } from "@/lib/services/email.service";
import { parseEmailList } from "@/lib/utils/invoice-validation";
import { INVOICE_QUEUE_NAME, JobName } from "@/lib/constants/job";
import { EInvoiceStatus } from "@/types/enums";
import { addInvoiceJob } from "./invoice-queue";

interface InvoiceJobData {
  invoiceId: string;
}

const RETRYABLE_PATTERNS = [
  "HTTP Error",
  "fetch failed",
  "EasyInvoice server error",
  "Failed to fetch payment",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "socket hang up",
];

function isRetryableError(message: string): boolean {
  return RETRYABLE_PATTERNS.some((p) => message.includes(p));
}

export const invoiceWorker = new Worker<InvoiceJobData>(
  INVOICE_QUEUE_NAME,
  async (job: Job<InvoiceJobData>) => {
    const { invoiceId } = job.data;

    if (job.name !== JobName.ISSUE_INVOICE) {
      return;
    }

    const supabase = createAdminClient();

    // 1. Atomic Lock: UPDATE status=issuing WHERE status=pending
    const { data: updated, error: lockError } = await supabase
      .from("invoices")
      .update({ status: EInvoiceStatus.Issuing })
      .eq("id", invoiceId)
      .eq("status", EInvoiceStatus.Pending)
      .select(
        "id, company_name, company_tax_code, company_address, recipient_email, line_items, payment_id, retry_count"
      )
      .maybeSingle();

    if (lockError) {
      throw new Error(`Failed to acquire DB lock for invoice ${invoiceId}: ${lockError.message}`);
    }

    if (!updated) {
      return;
    }

    const invoice = updated;

    try {
      // 2. Fetch payment amount
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("amount")
        .eq("id", invoice.payment_id)
        .single();

      if (paymentError || !payment) {
        const errMsg = `Failed to fetch payment: ${paymentError?.message || "Payment not found"}`;
        throw new Error(`Failed to fetch payment for invoice ${invoiceId}: ${errMsg}`);
      }

      const lineItem = Array.isArray(invoice.line_items)
        ? invoice.line_items[0]
        : (invoice.line_items as Record<string, unknown>);

      // 3. Check idempotency first: Check if invoice already exists in EasyInvoice by Ikey
      try {
        const checkRes = await getInvoiceByIkey(invoice.id);
        if (
          Number(checkRes.Status) === 2 &&
          checkRes.Data?.Invoices?.[0] &&
          checkRes.Data.Invoices[0].No
        ) {
          const details = checkRes.Data.Invoices[0];
          console.log(
            `[InvoiceWorker][${invoiceId}] Found existing issued invoice on EasyInvoice (No: ${details.No})`
          );

          await supabase
            .from("invoices")
            .update({
              status: EInvoiceStatus.Issued,
              provider_pattern: details.Pattern || process.env.EASYINVOICE_PATTERN || null,
              provider_serial: details.Serial || process.env.EASYINVOICE_SERIAL || null,
              provider_invoice_no: details.No,
              provider_lookup_code: details.LookupCode,
              link_view: details.LinkView || null,
              tax_authority_status: details.TCTCheckStatus || "0",
              tax_authority_error: details.TCTErrorMessage || null,
              issued_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", invoiceId);

          const emails = parseEmailList(invoice.recipient_email);
          const emailData = {
            invoiceId: invoice.id,
            companyName: invoice.company_name,
            invoiceNo: details.No,
            amount: Number(payment.amount),
          };

          await Promise.allSettled(emails.map((addr) => sendInvoiceIssuedEmail(addr, emailData)));
          return;
        }
      } catch (checkErr) {
        console.warn(
          `[InvoiceWorker][${invoiceId}] Idempotency check before publish warning:`,
          (checkErr as Error).message
        );
      }

      const publishPayload = {
        invoiceId: invoice.id,
        companyName: invoice.company_name,
        companyTaxCode: invoice.company_tax_code,
        companyAddress: invoice.company_address,
        recipientEmail: invoice.recipient_email,
        packageName:
          ((lineItem as Record<string, unknown>)?.name as string) || "Bản quyền phần mềm Vielora",
        packageCode: ((lineItem as Record<string, unknown>)?.code as string) || "SUB_GENERIC",
        amount: Number(payment.amount),
        sendEasyInvoiceEmail: false, // Ensure email is ONLY sent via Vielora (Resend)
      };

      // 4. Call EasyInvoice API
      const response = await publishInvoice(publishPayload);

      // 5. Evaluate EasyInvoice API Response
      const statusNum = Number(response.Status);

      if (statusNum === 2 && response.Data?.Invoices?.[0]) {
        // Success
        const details = response.Data.Invoices[0];

        await supabase
          .from("invoices")
          .update({
            status: EInvoiceStatus.Issued,
            provider_pattern: response.Data.Pattern || null,
            provider_serial: response.Data.Serial || null,
            provider_invoice_no: details.No || null,
            provider_lookup_code: details.LookupCode || null,
            link_view: details.LinkView || null,
            tax_authority_status: details.TCTCheckStatus || "0",
            tax_authority_error: details.TCTErrorMessage || null,
            issued_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", invoiceId);

        // Send invoice email to all recipients via Resend
        const emails = parseEmailList(invoice.recipient_email);
        const emailData = {
          invoiceId: invoice.id,
          companyName: invoice.company_name,
          invoiceNo: details.No || "",
          amount: Number(payment.amount),
        };

        const results = await Promise.allSettled(
          emails.map((addr) => sendInvoiceIssuedEmail(addr, emailData))
        );

        const failedEmails = results
          .map((r, i) => ({ addr: emails[i], result: r }))
          .filter((r) => r.result.status === "rejected" || r.result.value === false);

        if (failedEmails.length > 0) {
          console.error(
            `[InvoiceWorker][${invoiceId}] Failed to send invoice email to:`,
            failedEmails.map((f) => f.addr).join(", ")
          );
        } else {
          console.log(
            `[InvoiceWorker][${invoiceId}] Invoice emails sent to ${emails.length} recipient(s):`,
            emails.join(", ")
          );
        }
      } else {
        // Handle error response — check if invoice actually got issued on EasyInvoice anyway
        const errorDetail =
          response.Data?.KeyInvoiceMsg?.[invoiceId] || response.Message || "Unknown API error";

        try {
          const checkRes = await getInvoiceByIkey(invoice.id);
          if (
            Number(checkRes.Status) === 2 &&
            checkRes.Data?.Invoices?.[0] &&
            checkRes.Data.Invoices[0].No
          ) {
            const details = checkRes.Data.Invoices[0];
            console.log(
              `[InvoiceWorker][${invoiceId}] Recovered issued invoice from error response (No: ${details.No})`
            );

            await supabase
              .from("invoices")
              .update({
                status: EInvoiceStatus.Issued,
                provider_pattern: details.Pattern || process.env.EASYINVOICE_PATTERN || null,
                provider_serial: details.Serial || process.env.EASYINVOICE_SERIAL || null,
                provider_invoice_no: details.No,
                provider_lookup_code: details.LookupCode,
                link_view: details.LinkView || null,
                tax_authority_status: details.TCTCheckStatus || "0",
                tax_authority_error: details.TCTErrorMessage || null,
                issued_at: new Date().toISOString(),
                error_message: null,
              })
              .eq("id", invoiceId);

            const emails = parseEmailList(invoice.recipient_email);
            const emailData = {
              invoiceId: invoice.id,
              companyName: invoice.company_name,
              invoiceNo: details.No,
              amount: Number(payment.amount),
            };

            await Promise.allSettled(emails.map((addr) => sendInvoiceIssuedEmail(addr, emailData)));
            return;
          }
        } catch (fallbackCheckErr) {
          console.warn(
            `[InvoiceWorker][${invoiceId}] Fallback check getInvoiceByIkey failed:`,
            (fallbackCheckErr as Error).message
          );
        }

        // Status 5 = EasyInvoice server error → retryable
        if (statusNum === 5) {
          throw new Error(`EasyInvoice server error: ${errorDetail}`);
        }

        // Status 4 or other client errors → permanent failure
        await supabase
          .from("invoices")
          .update({
            status: EInvoiceStatus.Failed,
            error_message: errorDetail,
          })
          .eq("id", invoiceId);

        throw new Error(`EasyInvoice publish rejected (client error): ${errorDetail}`);
      }
    } catch (error) {
      const err = error as Error;

      // Fallback check on unexpected catch
      try {
        const checkRes = await getInvoiceByIkey(invoice.id);
        if (
          Number(checkRes.Status) === 2 &&
          checkRes.Data?.Invoices?.[0] &&
          checkRes.Data.Invoices[0].No
        ) {
          const details = checkRes.Data.Invoices[0];
          console.log(
            `[InvoiceWorker][${invoiceId}] Recovered issued invoice from catch block (No: ${details.No})`
          );

          await supabase
            .from("invoices")
            .update({
              status: EInvoiceStatus.Issued,
              provider_pattern: details.Pattern || process.env.EASYINVOICE_PATTERN || null,
              provider_serial: details.Serial || process.env.EASYINVOICE_SERIAL || null,
              provider_invoice_no: details.No,
              provider_lookup_code: details.LookupCode,
              link_view: details.LinkView || null,
              tax_authority_status: details.TCTCheckStatus || "0",
              tax_authority_error: details.TCTErrorMessage || null,
              issued_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", invoiceId);

          const { data: payment } = await supabase
            .from("payments")
            .select("amount")
            .eq("id", invoice.payment_id)
            .maybeSingle();

          const emails = parseEmailList(invoice.recipient_email);
          const emailData = {
            invoiceId: invoice.id,
            companyName: invoice.company_name,
            invoiceNo: details.No,
            amount: Number(payment?.amount || 0),
          };

          await Promise.allSettled(emails.map((addr) => sendInvoiceIssuedEmail(addr, emailData)));
          return;
        }
      } catch {
        // Ignore fallback error and proceed to standard retry/failure handling
      }

      if (isRetryableError(err.message)) {
        // Revert status to pending and increment retry_count
        await supabase
          .from("invoices")
          .update({
            status: EInvoiceStatus.Pending,
            error_message: err.message,
            retry_count: invoice.retry_count + 1,
          })
          .eq("id", invoiceId);

        throw err; // Bubbling error triggers BullMQ retry backoff
      } else {
        // Unrecoverable data/client error
        await supabase
          .from("invoices")
          .update({ status: EInvoiceStatus.Failed, error_message: err.message })
          .eq("id", invoiceId);
      }
    }
  },
  {
    connection: getRedisConnectionOptions(),
    concurrency: 1,
  }
);

async function scanOrphanedInvoices(): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("id, created_at")
      .eq("status", EInvoiceStatus.Pending)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("[InvoiceWorker] Failed to scan orphaned invoices:", error.message);
      return;
    }

    if (!invoices || invoices.length === 0) {
      console.log("[InvoiceWorker] No orphaned pending invoices found.");
      return;
    }

    console.log(
      `[InvoiceWorker] Found ${invoices.length} orphaned pending invoice(s). Adding to queue...`
    );

    for (const invoice of invoices) {
      try {
        await addInvoiceJob({ invoiceId: invoice.id });
        console.log(`[InvoiceWorker] Queued orphaned invoice: ${invoice.id}`);
      } catch (err) {
        console.error(
          `[InvoiceWorker] Failed to queue orphaned invoice ${invoice.id}:`,
          (err as Error).message
        );
      }
    }
  } catch (err) {
    console.error("[InvoiceWorker] Orphan scan error:", (err as Error).message);
  }
}

invoiceWorker.on("ready", () => {
  console.log("[InvoiceWorker] Worker ready and listening for jobs.");
  scanOrphanedInvoices();
});

invoiceWorker.on("error", (err) => {
  console.error("[InvoiceWorker] Worker error:", err.message);
});

invoiceWorker.on("failed", async (job, err) => {
  const invoiceId = job?.data?.invoiceId;
  const attemptsMade = job?.attemptsMade ?? 0;
  const maxAttempts = job?.opts?.attempts ?? 0;

  console.error(
    `[InvoiceWorker][${invoiceId}] Job failed (attempt ${attemptsMade}/${maxAttempts}):`,
    err.message
  );

  // If all retries exhausted, mark invoice as Failed
  if (attemptsMade >= maxAttempts) {
    try {
      const supabase = createAdminClient();
      await supabase
        .from("invoices")
        .update({ status: EInvoiceStatus.Failed, error_message: err.message })
        .eq("id", invoiceId)
        .in("status", [EInvoiceStatus.Pending, EInvoiceStatus.Issuing]);
    } catch (updateErr) {
      console.error(`[InvoiceWorker][${invoiceId}] Failed to mark invoice as Failed:`, updateErr);
    }
  }
});
