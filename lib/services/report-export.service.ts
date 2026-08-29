import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { REPORT_EXPORTS_BUCKET, WORKSPACE_BRANDING_BUCKET } from "@/config/storage";

export { REPORT_EXPORTS_BUCKET, WORKSPACE_BRANDING_BUCKET };

/**
 * Delete all report export records and their associated PDF files in storage for a given bot.
 * Strictly logs only the bot UUID to maintain PII safety.
 *
 * NOTE: This module must NOT import BullMQ / the report-export queue. It is imported
 * (via bot.service.ts) from client-reachable code paths, so any static or dynamic bullmq
 * import would pull Node built-ins into the client bundle and break `next build`.
 * Enqueue logic lives in `lib/jobs/report-export-enqueue.ts` instead.
 */
export async function deleteReportExportsByBotId(
  adminClient: SupabaseClient<Database> | SupabaseClient,
  botId: string
): Promise<void> {
  const normalizedBotId = botId?.trim();
  if (!normalizedBotId) {
    return;
  }

  try {
    // 1. Fetch file_path for all report exports belonging to this bot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: records, error: fetchError } = await (adminClient as any)
      .from("report_exports")
      .select("file_path")
      .eq("bot_id", normalizedBotId);

    if (fetchError) {
      console.error(
        `[ReportExportService] Failed to query report_exports for bot ${normalizedBotId}:`,
        fetchError
      );
    } else if (records && records.length > 0) {
      // 2. Extract valid file paths and remove from private storage bucket
      const filePaths = records
        .map((r: { file_path?: string | null }) => r.file_path)
        .filter((path: string | null | undefined): path is string =>
          Boolean(path && path.trim().length > 0)
        );

      if (filePaths.length > 0) {
        const { error: storageError } = await adminClient.storage
          .from(REPORT_EXPORTS_BUCKET)
          .remove(filePaths);

        if (storageError) {
          console.error(
            `[ReportExportService] Failed to delete storage objects for bot ${normalizedBotId}:`,
            storageError
          );
        }
      }
    }

    // 3. Delete database rows for this bot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (adminClient as any)
      .from("report_exports")
      .delete()
      .eq("bot_id", normalizedBotId);

    if (deleteError) {
      console.error(
        `[ReportExportService] Failed to delete report_exports rows for bot ${normalizedBotId}:`,
        deleteError
      );
    }
  } catch (err) {
    console.error(
      `[ReportExportService] Unexpected error cleaning up report exports for bot ${normalizedBotId}:`,
      err
    );
  }
}

/**
 * 30-day retention cleanup: deletes report_exports rows and storage files
 * older than retentionDays (default 30 days).
 */
export async function cleanExpiredReportExports(
  adminClient: SupabaseClient<Database> | SupabaseClient,
  retentionDays = 30
): Promise<number> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. Fetch expired records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: expiredRecords, error: fetchError } = await (adminClient as any)
      .from("report_exports")
      .select("id, file_path")
      .lt("created_at", cutoffDate);

    if (fetchError) {
      console.error("[ReportExportRetention] Failed to query expired report_exports:", fetchError);
      return 0;
    }

    if (!expiredRecords || expiredRecords.length === 0) {
      return 0;
    }

    // 2. Delete storage files
    const filePaths = expiredRecords
      .map((r: { file_path?: string | null }) => r.file_path)
      .filter((path: string | null | undefined): path is string =>
        Boolean(path && path.trim().length > 0)
      );

    if (filePaths.length > 0) {
      const { error: storageError } = await adminClient.storage
        .from(REPORT_EXPORTS_BUCKET)
        .remove(filePaths);

      if (storageError) {
        console.error(
          "[ReportExportRetention] Failed to delete expired storage files:",
          storageError
        );
      }
    }

    // 3. Delete database rows
    const ids = expiredRecords.map((r: { id: string }) => r.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (adminClient as any)
      .from("report_exports")
      .delete()
      .in("id", ids);

    if (deleteError) {
      console.error(
        "[ReportExportRetention] Failed to delete expired report_exports rows:",
        deleteError
      );
      return 0;
    }

    console.log(`[ReportExportRetention] Cleaned up ${expiredRecords.length} expired export(s).`);
    return expiredRecords.length;
  } catch (err) {
    console.error("[ReportExportRetention] Unexpected retention cleanup error:", err);
    return 0;
  }
}
