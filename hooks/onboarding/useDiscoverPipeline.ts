"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getDiscoveredPagesByBotId, type DiscoveredPage } from "@/lib/services/page.service";
import { startDiscover } from "@/lib/services/bot.service";
import { EBotStatus, JobTrackerMode } from "@/types";
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
      const { data, error: botError } = await supabase
        .from("bots")
        .select("status, domain")
        .eq("id", botId)
        .maybeSingle();

      if (cancelled) return;

      if (botError) {
        console.error("[UI: DiscoverPipeline] Fetch bot error:", botError);
        setPipelineError(botError.message);
      } else if (data) {
        const botData = data as { status: string; domain: string | null };
        setBotStatus(botData.status as EBotStatus);
        setBotDomain(botData.domain);
      }
    };

    void loadInitialState();
    return () => {
      cancelled = true;
    };
  }, [botId, supabase]);

  useEffect(() => {
    if (!botId || activeJobId) return;
    let cancelled = false;

    const fetchJobId = async () => {
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("id")
        .eq("bot_id", botId)
        .eq("name", "discover")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (jobError) {
        console.error("[UI: DiscoverPipeline] Fetch jobId error:", jobError);
      }

      const job = jobData as { id: string } | null;
      if (job?.id) {
        console.log("[UI: DiscoverPipeline] Found activeJobId:", job.id);
        setActiveJobId(job.id);
      } else {
        console.log("[UI: DiscoverPipeline] Job Discover not found, retrying...");
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
  }, [botId, activeJobId, supabase]);

  // Poll bot status every 3s; stop when terminal status reached
  useEffect(() => {
    if (!botId) return;
    let cancelled = false;

    const poll = async () => {
      const { data } = await supabase.from("bots").select("status").eq("id", botId).maybeSingle();
      if (cancelled) return;
      const newStatus = (data as { status?: EBotStatus } | null)?.status;
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
    };

    const interval = setInterval(() => void poll(), 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [botId, supabase]);

  // Job Tracker in Discover Worker
  const jobTracker = useJobTracker({ mode: JobTrackerMode.Job, jobId: activeJobId });

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
    crawledCount: jobTracker.uniqueActionCount,
  };
}
