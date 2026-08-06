"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ServiceClient } from "@/lib/services/types";
import { getPagesByBotId, type PageListItem } from "@/lib/services/page.service";
import { EPageStatus } from "@/types";

interface UsePageStatusPollerOptions {
  botId: string | null;
  supabase: ServiceClient;
  enabled: boolean;
  intervalMs?: number;
  onComplete?: (pages: PageListItem[]) => void;
}

function isTerminalStatus(status: string): boolean {
  return status === EPageStatus.Completed || status === EPageStatus.Failed;
}

function allPagesTerminal(pages: PageListItem[]): boolean {
  return pages.length > 0 && pages.every((p) => isTerminalStatus(p.status));
}

export function usePageStatusPoller({
  botId,
  supabase,
  enabled,
  intervalMs = 3000,
  onComplete,
}: UsePageStatusPollerOptions) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const fetchPages = useCallback(async (): Promise<PageListItem[] | null> => {
    if (!botId) return null;
    try {
      return await getPagesByBotId(supabase, botId, [
        EPageStatus.Pending,
        EPageStatus.Completed,
        EPageStatus.PendingIndex,
        EPageStatus.Processing,
        EPageStatus.Failed,
      ]);
    } catch (error) {
      console.error("[usePageStatusPoller] Error fetching pages:", error);
      return null;
    }
  }, [botId, supabase]);

  useEffect(() => {
    if (!enabled || !botId) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const poll = async () => {
      try {
        const pages = await fetchPages();
        if (cancelled || !pages) return;

        if (allPagesTerminal(pages)) {
          if (intervalId) clearInterval(intervalId);
          onCompleteRef.current?.(pages);
        }
      } catch {
        // fetchPages handles its own error logging
      }
    };

    void poll().then(() => {
      if (cancelled) return;
      intervalId = setInterval(() => void poll(), intervalMs);
    });

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [enabled, botId, fetchPages, intervalMs]);

  return { fetchPages };
}
