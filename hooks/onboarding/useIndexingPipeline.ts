"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getPipelineStatus } from "@/lib/services/bot.service";
import { getActiveJobsByBotId } from "@/lib/services/job.service";
import { EBotStatus } from "@/types";

export interface IndexingCounts {
  completed: number;
  failed: number;
  ignored: number;
  pendingIndex: number;
  processing: number;
  total: number;
  percent: number;
}

export interface UseIndexingPipelineReturn {
  botStatus: EBotStatus;
  trainingProgress: number;
  pagesFailed: number;
  pipelineError: string | null;
  counts: IndexingCounts;
}

interface UseIndexingPipelineOptions {
  onDone: () => void;
}

export function useIndexingPipeline(
  botId: string,
  options: UseIndexingPipelineOptions
): UseIndexingPipelineReturn {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { onDone } = options;

  const [botStatus, setBotStatus] = useState<EBotStatus>(EBotStatus.Indexing);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [pagesFailed, setPagesFailed] = useState(0);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const pipelineStatusQuery = useQuery({
    queryKey: ["onboarding-pipeline-status", botId],
    queryFn: () => getPipelineStatus(supabase, botId),
    enabled: !!botId && botStatus === EBotStatus.Indexing,
    refetchInterval: 3000,
    retry: 2,
  });

  const indexingJobsQuery = useQuery({
    queryKey: ["onboarding-indexing-jobs", botId],
    queryFn: () => getActiveJobsByBotId(supabase, botId),
    enabled: !!botId && botStatus === EBotStatus.Indexing,
    refetchInterval: (query) => {
      const activeJobs = query.state.data;
      if (activeJobs !== undefined && activeJobs.length === 0) return false;
      return 2500;
    },
    retry: 2,
  });

  useEffect(() => {
    const status = pipelineStatusQuery.data?.botStatus;
    const rawCounts = pipelineStatusQuery.data?.counts || {};

    if (!status) return;

    const failed = rawCounts.failed || 0;
    setPagesFailed(failed);

    if (status === EBotStatus.Indexing) {
      const completed = rawCounts.completed || 0;
      const ignored = rawCounts.ignored || 0;
      const pendingIndex = rawCounts.pending_index || 0;
      const processing = rawCounts.processing || 0;
      const total = pendingIndex + processing + completed + failed + ignored;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      setTrainingProgress(percent);
    }

    if (status === EBotStatus.Ready) {
      setTrainingProgress(100);
      setBotStatus(EBotStatus.Ready);
      onDone();
    }

    if (status === EBotStatus.Failed && !pipelineError) {
      setBotStatus(EBotStatus.Failed);
      setPipelineError("Pipeline gặp lỗi. Vui lòng thử lại.");
    }
  }, [onDone, pipelineStatusQuery.data, pipelineError]);

  useEffect(() => {
    const activeJobs = indexingJobsQuery.data;
    if (!activeJobs || activeJobs.length !== 0) return;
    pipelineStatusQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexingJobsQuery.data]);

  const counts = pipelineStatusQuery.data?.counts || {};
  const completed = counts.completed || 0;
  const failed = counts.failed || 0;
  const ignored = counts.ignored || 0;
  const pendingIndex = counts.pending_index || 0;
  const processing = counts.processing || 0;
  const total = pendingIndex + processing + completed + failed + ignored;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    botStatus,
    trainingProgress,
    pagesFailed,
    pipelineError,
    counts: {
      completed,
      failed,
      ignored,
      pendingIndex,
      processing,
      total,
      percent,
    },
  };
}
