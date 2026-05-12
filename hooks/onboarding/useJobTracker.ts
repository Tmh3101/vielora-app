"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  computeCounts,
  createDefaultCounts,
  getCurrentUrlFromData,
} from "@/lib/helpers/job-tracker-helpers";
import { canonicalizeActionKey } from "@/lib/helpers/url-helpers";
import {
  EJobStatus,
  JobTrackerMode,
  JobTrackerOptions,
  UseJobTrackerReturn,
  TrackedJob,
  SSEPayload,
  JobRowPick,
} from "@/types";

export function useJobTracker(options: JobTrackerOptions): UseJobTrackerReturn {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const jobMapRef = useRef<Map<string, TrackedJob>>(new Map());
  const seenActionKeysRef = useRef<Set<string>>(new Set());
  const lastDisplayedActionRef = useRef<string>("");
  const trackingKeyRef = useRef<string>("");

  const initialState: UseJobTrackerReturn = {
    progress: 0,
    status: null,
    currentAction: options.mode === JobTrackerMode.Aggregate ? options.jobName : "",
    uniqueActionCount: 0,
    error: null,
    counts: options.mode === JobTrackerMode.Aggregate ? createDefaultCounts() : undefined,
  };

  const [state, setState] = useState<UseJobTrackerReturn>(initialState);

  const mode = options.mode;
  const jobId = mode === JobTrackerMode.Job ? options.jobId : null;
  const botId = mode === JobTrackerMode.Aggregate ? options.botId : null;
  const jobName = mode === JobTrackerMode.Aggregate ? options.jobName : null;
  const totalPages = mode === JobTrackerMode.Aggregate ? options.totalPages : undefined;

  useEffect(() => {
    if (mode === JobTrackerMode.Job && !jobId) return;
    if (mode === JobTrackerMode.Aggregate && (!botId || !jobName)) return;

    let es: EventSource | null = null;
    let isMounted = true;
    const trackingKey =
      mode === JobTrackerMode.Job ? `job:${jobId}` : `aggregate:${botId}:${jobName}`;

    if (trackingKeyRef.current !== trackingKey) {
      trackingKeyRef.current = trackingKey;
      seenActionKeysRef.current.clear();
      lastDisplayedActionRef.current = "";
      jobMapRef.current.clear();
    }

    const applyAction = (candidate?: string): { isNew: boolean; count: number; value?: string } => {
      if (!candidate) return { isNew: false, count: seenActionKeysRef.current.size };
      const key = canonicalizeActionKey(candidate);
      if (!key || seenActionKeysRef.current.has(key)) {
        return { isNew: false, count: seenActionKeysRef.current.size };
      }
      seenActionKeysRef.current.add(key);
      lastDisplayedActionRef.current = candidate;
      return { isNew: true, count: seenActionKeysRef.current.size, value: candidate };
    };

    const handleRow = (row: JobRowPick) => {
      if (!isMounted) return;

      if (mode === JobTrackerMode.Aggregate) {
        jobMapRef.current.set(row.id, {
          status: (row.status ?? null) as EJobStatus | null,
          progress: row.progress ?? 0,
        });

        const counts = computeCounts(jobMapRef.current, totalPages);
        const nextAction = getCurrentUrlFromData(row.data);
        const actionResult = applyAction(nextAction);

        setState((prev) => ({
          ...prev,
          currentAction: actionResult.isNew ? (actionResult.value as string) : prev.currentAction,
          uniqueActionCount: actionResult.isNew ? actionResult.count : prev.uniqueActionCount,
          progress: Math.max(prev.progress, counts.percent),
          status: (row.status ?? prev.status) as EJobStatus | null,
          error: row.error_message ?? prev.error,
          counts,
        }));
      } else if (mode === JobTrackerMode.Job) {
        const nextAction = getCurrentUrlFromData(row.data);
        const actionResult = applyAction(nextAction);
        setState((prev) => ({
          ...prev,
          progress: Math.max(prev.progress, row.progress ?? prev.progress),
          status: (row.status ?? prev.status) as EJobStatus | null,
          currentAction: actionResult.isNew ? (actionResult.value as string) : prev.currentAction,
          uniqueActionCount: actionResult.isNew ? actionResult.count : prev.uniqueActionCount,
          error: row.error_message ?? prev.error,
        }));
      }
    };

    const loadJobs = async () => {
      if (!isMounted) return;
      try {
        let query = supabase.from("jobs").select("id, status, progress, data, error_message");
        if (mode === JobTrackerMode.Aggregate) {
          query = query.eq("bot_id", botId).eq("name", jobName);
        } else if (mode === JobTrackerMode.Job) {
          query = query.eq("id", jobId);
        }

        const { data, error } = await query;

        if (error) {
          if (isMounted) setState((prev) => ({ ...prev, error: error.message }));
          return;
        }

        const rows = (data ?? []) as JobRowPick[];
        if (rows.length > 0 && isMounted) {
          rows.forEach((row) => handleRow(row));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (isMounted) setState((prev) => ({ ...prev, error: message }));
      }
    };

    void loadJobs();
    const fallback = setInterval(() => void loadJobs(), 4000);

    if (mode === JobTrackerMode.Job && jobId) {
      console.log(`[UI: Realtime] Init SSE connection for jobId: ${jobId}`);
      es = new EventSource(`/api/jobs/stream?jobId=${jobId}`);

      es.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(event.data) as SSEPayload;
          console.log("[UI: Realtime] Payload SSE received:", payload);
          const actionResult = applyAction(payload.data?.current_url);

          setState((prev) => {
            const newProgress =
              payload.progress !== undefined
                ? Math.max(prev.progress, payload.progress)
                : prev.progress;

            return {
              ...prev,
              progress: newProgress,
              currentAction: actionResult.isNew
                ? (actionResult.value as string)
                : prev.currentAction,
              uniqueActionCount: actionResult.isNew ? actionResult.count : prev.uniqueActionCount,
            };
          });
        } catch (e) {
          console.error("Parse SSE error:", e);
        }
      };

      es.onerror = () => {
        console.error("[UI: Realtime] Error in SSE connection");
      };
    }

    if (mode === JobTrackerMode.Aggregate && botId) {
      console.log(`[UI: Realtime] Init aggregate SSE for botId: ${botId}`);
      es = new EventSource(`/api/jobs/stream/aggregate?botId=${botId}`);

      es.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(event.data) as SSEPayload;
          const actionResult = applyAction(payload.data?.current_url);
          setState((prev) => {
            const newProgress =
              payload.progress !== undefined
                ? Math.max(prev.progress, payload.progress)
                : prev.progress;

            return {
              ...prev,
              progress: newProgress,
              currentAction: actionResult.isNew
                ? (actionResult.value as string)
                : prev.currentAction,
              uniqueActionCount: actionResult.isNew ? actionResult.count : prev.uniqueActionCount,
            };
          });
        } catch (e) {
          console.error("Parse aggregate SSE error:", e);
        }
      };

      es.onerror = () => {
        console.error("[UI: Realtime] Error in aggregate SSE connection");
      };
    }

    // Cleanup memory leaks when unmount
    return () => {
      isMounted = false;
      clearInterval(fallback);
      if (es) es.close();
    };
  }, [botId, jobName, mode, jobId, supabase, totalPages]);

  return state;
}
