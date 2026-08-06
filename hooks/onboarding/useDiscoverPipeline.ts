"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getDiscoveredPagesByBotId, type DiscoveredPage } from "@/lib/services/page.service";
import { startDiscover } from "@/lib/services/bot.service";
import { EBotStatus, EPageStatus, JobTrackerMode } from "@/types";
import { ONBOARDING_DISCOVERED_PAGES_KEY } from "@/lib/constants/react-query-key";
import { buildCurationRows, type CurationRow } from "@/components/onboarding/utils";
import { useJobTracker } from "@/hooks/onboarding/useJobTracker";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { CrawlScope } from "@/lib/constants";

export interface UseDiscoverPipelineReturn {
  botStatus: EBotStatus;
  pagesFailed: number;
  pipelineError: string | null;
  curationRows: CurationRow[];
  isLoadingPages: boolean;
  retryDiscover: () => Promise<void>;
  currentAction: string;
  crawledCount: number;
  progress: number;
}

export function useDiscoverPipeline(botId: string): UseDiscoverPipelineReturn {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const crawlScope = useOnboardingStore((state) => state.crawlScope);

  const [botStatus, setBotStatus] = useState<EBotStatus>(EBotStatus.Pending);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [pagesFailed, setPagesFailed] = useState(0);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [botDomain, setBotDomain] = useState<string | null>(null);

  useEffect(() => {
    if (!botId) return;

    console.log("[UI: DiscoverPipeline] Initialized with botId:", botId);
    let cancelled = false;

    const loadInitialState = async () => {
      try {
        const res = await fetch(`/api/bots/${botId}`);
        if (cancelled) return;

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const botData = json.data as { status: string; domain: string | null };
            setBotStatus(botData.status as EBotStatus);
            setBotDomain(botData.domain);
          }
        } else {
          console.error("[UI: DiscoverPipeline] Fetch bot error:", res.status);
          setPipelineError("Cannot load bot information.");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[UI: DiscoverPipeline] Fetch bot error:", err);
          setPipelineError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    };

    void loadInitialState();
    return () => {
      cancelled = true;
    };
  }, [botId]);

  useEffect(() => {
    if (!botId || activeJobId) return;
    if (
      botStatus === EBotStatus.Discovered ||
      botStatus === EBotStatus.Ready ||
      botStatus === EBotStatus.Failed ||
      botStatus === EBotStatus.Indexing
    ) {
      return;
    }
    let cancelled = false;

    const fetchJobId = async () => {
      try {
        const res = await fetch(
          `/api/bots/${botId}/jobs?name=discover&fields=${encodeURIComponent("id")}&limit=1`
        );

        if (cancelled) return;

        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const job = json.data[0] as { id: string };
            console.log("[UI: DiscoverPipeline] Found activeJobId:", job.id);
            setActiveJobId(job.id);
            return;
          }
        }
        console.log("[UI: DiscoverPipeline] Job Discover not found, retrying...");
      } catch (err) {
        if (!cancelled) {
          console.error("[UI: DiscoverPipeline] Fetch jobId error:", err);
        }
      }
    };

    void fetchJobId();
    const interval = setInterval(() => {
      void fetchJobId();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [botId, activeJobId, botStatus]);

  // Poll bot status every 3s; stop when terminal status reached
  useEffect(() => {
    if (!botId) return;
    if (
      botStatus === EBotStatus.Discovered ||
      botStatus === EBotStatus.Ready ||
      botStatus === EBotStatus.Failed ||
      botStatus === EBotStatus.Indexing
    ) {
      return;
    }
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/bots/${botId}`);
        if (cancelled) return;
        if (res.ok) {
          const json = await res.json();
          const newStatus = json.data?.status as EBotStatus | undefined;
          console.log("[UI: DiscoverPipeline] Polled bot status:", newStatus);
          if (!newStatus) return;
          setBotStatus((prev) => {
            if (prev === newStatus) return prev;
            if (newStatus === EBotStatus.Failed) {
              setPipelineError((e) => e ?? "Discover encountered an error. Please try again.");
            } else {
              setPipelineError(null);
            }
            return newStatus;
          });
        }
      } catch {
        // ignore polling errors
      }
    };

    const interval = setInterval(() => void poll(), 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [botId, botStatus]);

  // Job Tracker in Discover Worker
  const jobTracker = useJobTracker({ mode: JobTrackerMode.Job, jobId: activeJobId });

  const discoveredCountQuery = useQuery({
    queryKey: [ONBOARDING_DISCOVERED_PAGES_KEY, "count", botId],
    queryFn: async (): Promise<number> => {
      const res = await fetch(`/api/bots/${botId}/pages`);
      if (!res.ok) return 0;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data.filter((p: { status: string }) => p.status === EPageStatus.Pending).length;
      }
      return 0;
    },
    enabled:
      !!botId &&
      (botStatus === EBotStatus.Pending ||
        botStatus === EBotStatus.Discovering ||
        botStatus === EBotStatus.Discovered),
    refetchInterval:
      botStatus === EBotStatus.Pending || botStatus === EBotStatus.Discovering ? 4000 : false,
    retry: 1,
  });

  const discoveredPagesQuery = useQuery({
    queryKey: [ONBOARDING_DISCOVERED_PAGES_KEY, botId],
    queryFn: (): Promise<DiscoveredPage[]> => getDiscoveredPagesByBotId(supabase, botId),
    enabled: !!botId && botStatus === EBotStatus.Discovered,
    retry: 1,
  });

  useEffect(() => {
    if (botStatus === EBotStatus.Discovered) {
      discoveredPagesQuery.refetch();
    }
  }, [botStatus, discoveredPagesQuery]);

  const retryDiscover = async (): Promise<void> => {
    if (!botDomain) {
      setPipelineError("Cannot determine domain to retry discover.");
      return;
    }

    setPipelineError(null);
    setPagesFailed(0);
    setBotStatus(EBotStatus.Discovering);
    setActiveJobId(null);

    const formattedUrl = botDomain.startsWith("http") ? botDomain : `https://${botDomain}`;
    try {
      const { discoverJobId: jobId } = await startDiscover(supabase, {
        botId,
        url: formattedUrl,
        includeSubdomains: crawlScope === CrawlScope.FULL_WEBSITE,
      });
      setActiveJobId(jobId);
    } catch (err) {
      setPipelineError(err instanceof Error ? err.message : "Cannot initiate Discover.");
    }
  };

  const jobPipelineError =
    botStatus === EBotStatus.Failed
      ? (jobTracker.error ?? "Discover failed. Please try again.")
      : null;
  const visiblePipelineError = pipelineError ?? jobPipelineError;

  return {
    botStatus,
    pagesFailed,
    pipelineError: visiblePipelineError,
    curationRows: buildCurationRows(discoveredPagesQuery.data || []),
    isLoadingPages: discoveredPagesQuery.isLoading,
    retryDiscover,
    currentAction: jobTracker.currentAction || "Đang khởi tạo...",
    crawledCount: Math.max(jobTracker.uniqueActionCount, discoveredCountQuery.data ?? 0),
    progress: jobTracker.progress,
  };
}
