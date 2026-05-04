"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getJobById } from "@/lib/services/job.service";
import { getDiscoveredPagesByBotId, type DiscoveredPage } from "@/lib/services/page.service";
import { startDiscover } from "@/lib/services/bot.service";
import { EBotStatus, EJobStatus } from "@/types";
import { buildCurationRows, type CurationRow } from "@/components/onboarding/utils";

interface DiscoverJobLookupResult {
  id: string;
}

interface BotStateLookupResult {
  domain: string | null;
  status: EBotStatus | null;
}

export interface UseDiscoverPipelineReturn {
  botStatus: EBotStatus;
  trainingProgress: number;
  pagesFailed: number;
  pipelineError: string | null;
  curationRows: CurationRow[];
  isLoadingPages: boolean;
  retryDiscover: () => Promise<void>;
}

export function useDiscoverPipeline(botId: string): UseDiscoverPipelineReturn {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [botStatus, setBotStatus] = useState<EBotStatus>(EBotStatus.Pending);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [pagesFailed, setPagesFailed] = useState(0);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [manualDiscoverJobId, setManualDiscoverJobId] = useState<string | null>(null);
  const [botDomain, setBotDomain] = useState<string | null>(null);

  useEffect(() => {
    const loadBotState = async () => {
      const { data, error } = await supabase
        .from("bots")
        .select("status, domain")
        .eq("id", botId)
        .maybeSingle();

      if (error || !data) {
        setBotStatus(EBotStatus.Pending);
        return;
      }

      const botData = data as unknown as BotStateLookupResult;
      setBotDomain(botData.domain ?? null);
      setBotStatus(botData.status ?? EBotStatus.Pending);
      if (botData.status === EBotStatus.Discovering) {
        setTrainingProgress(10);
      }
    };

    void loadBotState();
  }, [botId, supabase]);

  const discoverJobIdQuery = useQuery({
    queryKey: ["onboarding-discover-job-id", botId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id")
        .eq("bot_id", botId)
        .eq("name", "discover")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return (data as DiscoverJobLookupResult).id;
    },
    enabled: !!botId && botStatus === EBotStatus.Discovering && !manualDiscoverJobId,
    refetchInterval: (query) => (query.state.data ? false : 1000),
    retry: 1,
  });

  const discoverJobId = manualDiscoverJobId ?? discoverJobIdQuery.data ?? null;

  useEffect(() => {
    if (!discoverJobIdQuery.data) return;
    const timer = window.setTimeout(() => {
      setManualDiscoverJobId(discoverJobIdQuery.data);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [discoverJobIdQuery.data]);

  const discoverJobQuery = useQuery({
    queryKey: ["onboarding-discover-job", discoverJobId],
    queryFn: () => getJobById(supabase, discoverJobId!),
    enabled: !!discoverJobId && botStatus === EBotStatus.Discovering,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s === EJobStatus.Completed || s === EJobStatus.Failed) return false;
      return 2500;
    },
    retry: 2,
  });

  useEffect(() => {
    const job = discoverJobQuery.data;
    if (!job) return;

    const timer = window.setTimeout(() => {
      if (job.status === EJobStatus.Active || job.status === EJobStatus.Pending) {
        setTrainingProgress(Math.min(Math.max(job.progress ?? 10, 10), 90));
      }

      if (job.status === EJobStatus.Completed) {
        setBotStatus(EBotStatus.Discovered);
        setTrainingProgress(100);
        setPipelineError(null);
      }

      if (job.status === EJobStatus.Failed) {
        setBotStatus(EBotStatus.Failed);
        setPipelineError(job.error_message || "Discover thất bại. Vui lòng thử lại.");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [discoverJobQuery.data]);

  const discoveredPagesQuery = useQuery({
    queryKey: ["onboarding-discovered-pages", botId],
    queryFn: (): Promise<DiscoveredPage[]> => getDiscoveredPagesByBotId(supabase, botId),
    enabled: !!botId && botStatus === EBotStatus.Discovered,
    retry: 1,
  });

  useEffect(() => {
    if (botStatus !== EBotStatus.Discovered) return;
    discoveredPagesQuery.refetch();
  }, [botStatus, discoveredPagesQuery]);

  const retryDiscover = async (): Promise<void> => {
    if (!botDomain) {
      setPipelineError("Không thể xác định domain để chạy lại discover.");
      return;
    }

    setPipelineError(null);
    setPagesFailed(0);
    setBotStatus(EBotStatus.Discovering);
    setTrainingProgress(10);
    setManualDiscoverJobId(null);

    const formattedUrl = botDomain.startsWith("http") ? botDomain : `https://${botDomain}`;
    const { discoverJobId: jobId } = await startDiscover(supabase, {
      botId,
      url: formattedUrl,
    });

    setManualDiscoverJobId(jobId);
  };

  return {
    botStatus,
    trainingProgress,
    pagesFailed,
    pipelineError,
    curationRows: buildCurationRows(discoveredPagesQuery.data || []),
    isLoadingPages: discoveredPagesQuery.isLoading,
    retryDiscover,
  };
}
