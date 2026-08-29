import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { deductWorkspaceCredits, refundWorkspaceCredits } from "@/lib/services/credit.service";
import { CREDIT_PER_REPORT } from "@/config/credit";
import { ETransactionType } from "@/types";
import { getBranding } from "@/lib/reports/branding-provider";
import { resolveReportLanguage } from "@/lib/reports/language-resolver";
// BullMQ queue is imported dynamically so this module (and its importers, e.g. API
// routes) never statically pull bullmq's Node built-ins into a client bundle.
import { addReportExportJob } from "@/lib/jobs/report-export-queue";

export interface EnqueueReportExportParams {
  exportId?: string;
  workspaceId: string;
  botId: string;
  templateId: string;
  templateKey: string;
  requestedBy: string;
  language?: string;
  scope?: Record<string, unknown>;
}

export interface ReportExportRecord {
  id: string;
  workspace_id: string;
  template_id: string;
  bot_id: string;
  scope: Record<string, unknown>;
  requested_by: string;
  status: string;
  language: string;
  file_path: string | null;
  error_message: string | null;
  retry_count: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Enqueue a new report export:
 * 1. Resolve effective language via workspace branding.
 * 2. Deduct credits from workspace wallet (ETransactionType.AddKnowledge).
 * 3. Insert report_exports row with default 'pending' status.
 * 4. Enqueue job into BullMQ report-export queue.
 * On any failure, refund credits and update/cleanup accordingly.
 */
export async function enqueueReportExport(
  adminClient: SupabaseClient<Database> | SupabaseClient,
  params: EnqueueReportExportParams
): Promise<ReportExportRecord> {
  const exportId = params.exportId || crypto.randomUUID();
  const branding = await getBranding(adminClient, params.workspaceId);
  const language = resolveReportLanguage(branding, params.language || "vi");
  const scope = params.scope || {};

  const targetLanguages =
    Array.isArray(scope?.languages) && scope.languages.length > 0
      ? (scope.languages as string[])
      : [params.language || language || "vi"];
  const fileCount = (scope?.fileCount as number) || targetLanguages.length;
  const totalCost = (scope?.totalCreditCost as number) || fileCount * CREDIT_PER_REPORT;

  // 1. Deduct credits before enqueuing (10 credits / file)
  const deductionResult = await deductWorkspaceCredits(adminClient, {
    workspaceId: params.workspaceId,
    creditAmount: totalCost,
    transactionType: ETransactionType.AddKnowledge,
    transactionDescription: `Export report: ${params.templateKey} (${fileCount} file${fileCount > 1 ? "s" : ""})`,
  });

  if (!deductionResult.success) {
    throw new Error(deductionResult.message || "Insufficient workspace credits to export report.");
  }

  const enrichedScope = {
    ...scope,
    languages: targetLanguages,
    fileCount,
    totalCreditCost: totalCost,
    deducted_credits: totalCost,
    deducted_from_subscription: deductionResult.deductedFromSubscription ?? 0,
    deducted_from_payg: deductionResult.deductedFromPayg ?? 0,
  };

  // 2. Insert report_exports row with default 'pending' status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertError } = await (adminClient as any)
    .from("report_exports")
    .insert({
      id: exportId,
      workspace_id: params.workspaceId,
      template_id: params.templateId,
      bot_id: params.botId,
      scope: enrichedScope,
      requested_by: params.requestedBy,
      status: "pending",
      language,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    // Refund credits on DB insert failure
    await refundWorkspaceCredits(adminClient, {
      workspaceId: params.workspaceId,
      deductedFromSubscription: deductionResult.deductedFromSubscription ?? 0,
      deductedFromPayg: deductionResult.deductedFromPayg ?? 0,
      transactionType: ETransactionType.AddKnowledge,
      transactionDescription: `Refund failed enqueue report: ${params.templateKey}`,
    });
    throw new Error(
      `Failed to create report export record: ${insertError?.message || "Unknown error"}`
    );
  }

  // 3. Enqueue job into BullMQ (queue module handles its own dynamic bullmq import)
  try {
    await addReportExportJob({
      exportId,
      workspaceId: params.workspaceId,
      botId: params.botId,
      templateKey: params.templateKey,
      language,
      scope: enrichedScope,
    });
  } catch (queueError) {
    // Update status to failed and refund credits if queue add fails
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from("report_exports")
      .update({ status: "failed", error_message: (queueError as Error).message })
      .eq("id", exportId);

    await refundWorkspaceCredits(adminClient, {
      workspaceId: params.workspaceId,
      deductedFromSubscription: deductionResult.deductedFromSubscription ?? 0,
      deductedFromPayg: deductionResult.deductedFromPayg ?? 0,
      transactionType: ETransactionType.AddKnowledge,
      transactionDescription: `Refund failed enqueue report: ${params.templateKey}`,
    });

    throw queueError;
  }

  return inserted as ReportExportRecord;
}
