"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspace } from "@/hooks/useWorkspace";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canExportReport } from "@/lib/helpers/report-permission";
import { ExportReportModal } from "@/components/dashboard/bot-detail/ExportReportModal";
import { useTranslations } from "next-intl";

export interface ExportReportButtonProps {
  botId: string;
  workspaceId?: string | null;
  botUserId?: string | null;
  className?: string;
}

export function ExportReportButton({
  botId,
  workspaceId,
  botUserId,
  className,
}: ExportReportButtonProps) {
  const t = useTranslations("dashboard.reports");
  const [modalOpen, setModalOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const user = useAuthStore((s) => s.user);
  const { activeWorkspace } = useWorkspace();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const resolvedWsId = workspaceId || activeWorkspace?.id;

  useEffect(() => {
    let isMounted = true;

    async function checkPermission() {
      if (!user?.id || !resolvedWsId || !botId) {
        if (isMounted) setHasPermission(false);
        return;
      }

      // Fast check: if user is creator of the bot
      if (botUserId && botUserId === user.id) {
        if (isMounted) setHasPermission(true);
        return;
      }

      try {
        const allowed = await canExportReport(
          supabase as unknown as SupabaseClient,
          resolvedWsId,
          botId,
          user.id
        );
        if (isMounted) setHasPermission(allowed);
      } catch (err) {
        console.error("[ExportReportButton] Permission check error:", err);
        if (isMounted) setHasPermission(false);
      }
    }

    void checkPermission();

    return () => {
      isMounted = false;
    };
  }, [user?.id, resolvedWsId, botId, botUserId, supabase]);

  // If permission check resolved to false, do not render button
  if (hasPermission === false) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setModalOpen(true)}
        disabled={hasPermission === null}
        className={
          className ||
          "shadow-2xs rounded-xl border-border/60 bg-background/50 text-xs font-medium transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-95"
        }
        title={t("generateReport")}
      >
        {hasPermission === null ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <FileDown className="h-3.5 w-3.5" />
        )}
        {t("generateReport")}
      </Button>

      {resolvedWsId && (
        <ExportReportModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          botId={botId}
          workspaceId={resolvedWsId}
        />
      )}
    </>
  );
}
