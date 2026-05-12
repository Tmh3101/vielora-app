"use client";

import { useEffect, useRef } from "react";
import { useJobTracker } from "@/hooks/onboarding/useJobTracker";
import { EJobStatus } from "@/types";

interface UseReindexDiscoverParams {
  botId: string | null;
  discoverJobId: string | null;
  onDiscovered: () => void;
}

export interface UseReindexDiscoverReturn {
  isDiscovering: boolean;
  currentAction: string;
  crawledCount: number;
  pipelineError: string | null;
}

export function useReindexDiscover({
  discoverJobId,
  onDiscovered,
}: UseReindexDiscoverParams): UseReindexDiscoverReturn {
  const onDiscoveredRef = useRef(onDiscovered);
  useEffect(() => {
    onDiscoveredRef.current = onDiscovered;
  }, [onDiscovered]);

  const jobTracker = useJobTracker({ mode: "job", jobId: discoverJobId });

  useEffect(() => {
    if (!discoverJobId) return;
    if (jobTracker.status === EJobStatus.Completed) {
      onDiscoveredRef.current();
    }
  }, [jobTracker.status, jobTracker.error, discoverJobId]);

  const derivedError =
    jobTracker.status === EJobStatus.Failed
      ? jobTracker.error || "Quá trình quét website thất bại. Vui lòng thử lại."
      : null;

  return {
    isDiscovering: !!discoverJobId,
    currentAction: jobTracker.currentAction || "Đang khởi tạo...",
    crawledCount: jobTracker.uniqueActionCount,
    pipelineError: derivedError,
  };
}
