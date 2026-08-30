import { Worker, type Job } from "bullmq";
import puppeteer from "puppeteer";
import { getRedisConnectionOptions } from "@/lib/config/redis";
import { createAdminClient } from "@/lib/supabase/server";
import { signInternalRenderToken } from "@/lib/helpers/report-token";
import { refundWorkspaceCredits } from "@/lib/services/credit.service";
import { CREDIT_PER_REPORT } from "@/config/credit";
import { ETransactionType } from "@/types";
import { REPORT_EXPORT_QUEUE_NAME, REPORT_EXPORT_WORKER_CONCURRENCY } from "@/lib/constants/job";
import type { ReportExportJobData } from "@/lib/jobs/report-export-queue";

// CRITICAL: PII-Safe logging — Only log the 4 UUIDs, never log scope data, content, or user names
const log = (exportId: string, status: string, botId: string, workspaceId: string) =>
  console.log(`[ReportExport][${exportId}] status=${status} bot=${botId} ws=${workspaceId}`);

const INTERNAL_BASE_URL = process.env.INTERNAL_BASE_URL || "http://localhost:3000";

export const reportExportWorker = new Worker<ReportExportJobData>(
  REPORT_EXPORT_QUEUE_NAME,
  async (job: Job<ReportExportJobData>) => {
    const { exportId, workspaceId, botId, templateKey, language = "vi" } = job.data;
    log(exportId, "rendering", botId, workspaceId);

    const adminClient = createAdminClient();

    // 1. Update status → 'rendering'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: renderingError } = await (adminClient as any)
      .from("report_exports")
      .update({ status: "rendering" })
      .eq("id", exportId);

    if (renderingError) {
      console.error(
        `[ReportExport][${exportId}] Failed to update status to rendering:`,
        renderingError.message
      );
    }

    // 2. Fetch export record and target languages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exportRow } = await (adminClient as any)
      .from("report_exports")
      .select("*, report_templates(id, key, name, languages)")
      .eq("id", exportId)
      .single();

    const scope = (exportRow?.scope as Record<string, unknown>) || {};
    const templateRecord = Array.isArray(exportRow?.report_templates)
      ? exportRow?.report_templates[0]
      : exportRow?.report_templates;

    let targetLanguages: string[] = [];
    if (Array.isArray(scope.languages) && scope.languages.length > 0) {
      targetLanguages = scope.languages as string[];
    } else if (Array.isArray(templateRecord?.languages) && templateRecord.languages.length > 0) {
      targetLanguages = templateRecord.languages as string[];
    } else if (language) {
      targetLanguages = [language];
    } else {
      targetLanguages = ["vi"];
    }

    const templateName = templateRecord?.name || templateRecord?.key || "Report";
    const cleanTitle = (templateName || "Report")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_");

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    let browser: import("puppeteer").Browser | null = null;

    try {
      // 3. Sign internal render token (10 min)
      const renderToken = signInternalRenderToken(exportId);

      // 4. Launch dedicated Puppeteer instance
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--font-render-hinting=medium",
          "--enable-font-antialiasing",
        ],
      });

      const generatedFiles: Array<{
        lang: string;
        path: string;
        filename: string;
      }> = [];

      // 5. Generate one separate PDF per language
      for (const lang of targetLanguages) {
        console.log(`[ReportExport][${exportId}] Rendering PDF for language: ${lang}`);
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({ "x-report-token": renderToken });
        await page.goto(`${INTERNAL_BASE_URL}/internal/reports/render/${exportId}?lang=${lang}`, {
          waitUntil: "domcontentloaded",
          timeout: 35000,
        });

        await page.waitForFunction(() => document.getElementById("report-ready") !== null, {
          timeout: 35000,
        });

        // Ensure all fonts (including Arabic & Vietnamese) are fully loaded before capturing PDF
        try {
          await page.evaluateHandle("document.fonts.ready");
        } catch {
          // Ignore font loading errors
        }

        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
        });

        await page.close();

        // Upload single-language PDF
        const langFilePath = `${workspaceId}/${exportId}_${lang}.pdf`;
        const { error: uploadError } = await adminClient.storage
          .from("report-exports")
          .upload(langFilePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

        if (uploadError) {
          throw new Error(`Storage upload failed for ${lang}: ${uploadError.message}`);
        }

        generatedFiles.push({
          lang,
          path: langFilePath,
          filename: `${cleanTitle}_${lang}_${dateStr}_${exportId.slice(0, 8)}.pdf`,
        });
      }

      // Also ensure primary file path points to the first generated PDF
      const primaryFilePath = generatedFiles[0]?.path || `${workspaceId}/${exportId}.pdf`;

      await browser.close();
      browser = null;

      // 6. Final status is 'issued'
      const finalStatus = "issued";

      const updatedScope = {
        ...scope,
        files: generatedFiles,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: statusUpdateError } = await (adminClient as any)
        .from("report_exports")
        .update({
          status: finalStatus,
          file_path: primaryFilePath,
          error_message: null,
          scope: updatedScope,
        })
        .eq("id", exportId);

      if (statusUpdateError) {
        throw new Error(`Failed to update export status: ${statusUpdateError.message}`);
      }

      log(exportId, finalStatus, botId, workspaceId);

      // 7. If triggered from a Group Chat, broadcast notification message into the group
      const targetGroupId = (scope.groupId as string) || null;

      if (targetGroupId) {
        try {
          const LANGUAGE_FLAG_MAP: Record<string, string> = {
            vi: "🇻🇳 Tiếng Việt",
            en: "🇬🇧 English",
            ar: "🇸🇦 Tiếng Ả Rập",
            ja: "🇯🇵 Tiếng Nhật",
            ko: "🇰🇷 Tiếng Hàn",
            zh: "🇨🇳 Tiếng Trung",
            fr: "🇫🇷 Tiếng Pháp",
            de: "🇩🇪 Tiếng Đức",
            es: "🇪🇸 Tiếng Tây Ban Nha",
          };

          // Create signed URLs (valid for 7 days) for each generated language PDF
          const downloadLinks = await Promise.all(
            generatedFiles.map(async (file) => {
              const { data: signData } = await adminClient.storage
                .from("report-exports")
                .createSignedUrl(file.path, 60 * 60 * 24 * 7);

              const flagLabel = LANGUAGE_FLAG_MAP[file.lang] || `🌐 ${file.lang.toUpperCase()}`;

              return `[${flagLabel} (PDF)](${signData?.signedUrl || file.path})`;
            })
          );

          let requester = (scope.requestedByDisplayName as string)?.trim() || "";
          if (!requester && exportRow?.requested_by) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: userProfile } = await (adminClient as any)
                .from("profiles")
                .select("display_name, full_name, email")
                .eq("id", exportRow.requested_by)
                .maybeSingle();

              requester =
                userProfile?.display_name ||
                userProfile?.full_name ||
                userProfile?.email?.split("@")[0] ||
                "";
            } catch {
              // ignore profile query errors
            }
          }
          if (!requester) requester = "Thành viên nhóm";

          const customTitle = (scope.reportTitle as string)?.trim() || "";

          const lines = [
            `📄 **Báo cáo mới đã được tạo thành công!**`,
            `• **Mẫu báo cáo**: *${templateName}*`,
          ];

          if (customTitle && customTitle !== templateName) {
            lines.push(`• **Tiêu đề**: *${customTitle}*`);
          }

          lines.push(`• **Người yêu cầu**: @${requester}`);
          lines.push(``);
          lines.push(`📥 **Tải về**: ${downloadLinks.join("  |  ")}`);

          const messageContent = lines.join("\n");

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminClient as any).from("group_messages").insert({
            group_id: targetGroupId,
            sender_type: "bot",
            sender_id: null,
            content: messageContent,
            should_bot_reply: false,
          });

          console.log(
            `[ReportExport][${exportId}] Broadcasted completion notification to group ${targetGroupId}`
          );
        } catch (msgErr) {
          // Non-blocking: Do not fail the whole export job if message broadcast encounters an error
          console.error(
            `[ReportExport][${exportId}] Failed to send group chat notification:`,
            msgErr
          );
        }
      }
    } catch (err) {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // Ignore
        }
      }

      log(exportId, "failed", botId, workspaceId);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminClient as any)
          .from("report_exports")
          .update({ status: "failed", error_message: (err as Error).message })
          .eq("id", exportId);
      } catch {
        // Ignore
      }

      try {
        const fileCount =
          Array.isArray(scope?.languages) && scope.languages.length > 0
            ? scope.languages.length
            : 1;
        const totalDeducted = (scope?.deducted_credits as number) || fileCount * CREDIT_PER_REPORT;
        const subDeducted =
          typeof scope?.deducted_from_subscription === "number"
            ? scope.deducted_from_subscription
            : totalDeducted;
        const paygDeducted =
          typeof scope?.deducted_from_payg === "number" ? scope.deducted_from_payg : 0;

        await refundWorkspaceCredits(adminClient, {
          workspaceId,
          deductedFromSubscription: subDeducted,
          deductedFromPayg: paygDeducted,
          transactionType: ETransactionType.AddKnowledge,
          transactionDescription: `Refund export report: ${templateKey}`,
        });
      } catch (refundErr) {
        console.error(
          `[ReportExport][${exportId}] Failed to refund workspace credits:`,
          (refundErr as Error).message
        );
      }

      throw err;
    }
  },
  {
    connection: getRedisConnectionOptions(),
    concurrency: REPORT_EXPORT_WORKER_CONCURRENCY,
  }
);

reportExportWorker.on("ready", () => {
  console.log("[ReportExportWorker] Worker ready and listening for jobs.");
});

reportExportWorker.on("error", (err) => {
  console.error("[ReportExportWorker] Worker error:", err.message);
});

reportExportWorker.on("failed", (job, err) => {
  const exportId = job?.data?.exportId;
  const attemptsMade = job?.attemptsMade ?? 0;
  const maxAttempts = job?.opts?.attempts ?? 0;

  console.error(
    `[ReportExportWorker][${exportId}] Job failed (attempt ${attemptsMade}/${maxAttempts}):`,
    err.message
  );
});

export async function closeReportExportWorker(): Promise<void> {
  if (reportExportWorker) {
    await reportExportWorker.close();
  }
}
