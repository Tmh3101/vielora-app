"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { EBotStatus } from "@/types";

export interface UseIndexingPipelineReturn {
  botStatus: EBotStatus;
  pipelineError: string | null;
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
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const doneRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!botId) return;
    let cancelled = false;

    const loadStatus = async () => {
      const { data, error } = await supabase
        .from("bots")
        .select("status")
        .eq("id", botId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setPipelineError(error.message);
        return;
      }
      const status = (data as { status?: EBotStatus | null } | null)?.status;
      if (status) {
        setBotStatus(status);
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [botId, supabase]);

  // Poll bot status every 3s; stop on terminal status (Ready or Failed)
  useEffect(() => {
    if (!botId) return;
    doneRef.current = false;
    let cancelled = false;

    const poll = async () => {
      const { data } = await supabase.from("bots").select("status").eq("id", botId).maybeSingle();
      if (cancelled) return;
      const newStatus = (data as { status?: EBotStatus } | null)?.status;
      if (!newStatus) return;

      setBotStatus(newStatus);

      if (newStatus === EBotStatus.Ready && !doneRef.current) {
        doneRef.current = true;
        clearInterval(intervalRef.current!);
        onDone();
        return;
      }
      if (newStatus === EBotStatus.Failed) {
        clearInterval(intervalRef.current!);
        setPipelineError((prev) => prev ?? "Pipeline gặp lỗi. Vui lòng thử lại.");
      }
    };

    intervalRef.current = setInterval(() => void poll(), 5000);
    void poll(); // immediate first check

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current!);
    };
  }, [botId, onDone, supabase]);

  return {
    botStatus,
    pipelineError,
  };
}
