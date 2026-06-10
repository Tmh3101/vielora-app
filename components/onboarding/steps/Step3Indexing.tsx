"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BrainCircuit, CheckCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useJobTracker } from "@/hooks/onboarding/useJobTracker";
import { useIndexingPipeline } from "@/hooks/onboarding/useIndexingPipeline";
import { FailedPipelineView } from "@/components/onboarding/views/FailedPipelineView";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ElegantProgress } from "@/components/onboarding/shared/ElegantProgress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { EBotStatus, JobTrackerMode, EPageStatus } from "@/types";
import { getPhaseBadgeClass, getPhaseLabel } from "@/components/onboarding/utils";
import { JobName } from "@/lib/constants/job";

export interface Step3IndexingProps {
  botId: string;
  onDone: () => void;
}

export function Step3Indexing({ botId, onDone }: Step3IndexingProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);

  const { botStatus, pipelineError } = useIndexingPipeline(botId, { onDone });

  // Fetch total pages count once when indexing starts
  useEffect(() => {
    if (!botId) return;
    let cancelled = false;

    const fetchTotalPages = async () => {
      const { count, error } = await supabase
        .from("pages")
        .select("id", { count: "exact", head: true })
        .eq("bot_id", botId)
        .in("status", [EPageStatus.PendingIndex]);

      if (!cancelled && !error && count != null) {
        setTotalPages(count);
      }

      console.log("Fetched total pages for indexing:", { count });
    };

    void fetchTotalPages();
    return () => {
      cancelled = true;
    };
  }, [botId, supabase]);

  const jobTracker = useJobTracker({
    mode: JobTrackerMode.Aggregate,
    botId,
    jobName: JobName.INDEX,
    totalPages,
  });

  const trackerCounts = jobTracker.counts ?? {
    completed: 0,
    failed: 0,
    pending: 0,
    processing: 0,
    total: 0,
    percent: 0,
  };

  if (botStatus === EBotStatus.Failed) {
    return (
      <FailedPipelineView
        pipelineError={pipelineError}
        onRetry={() => router.push("/onboarding")}
        onBackToDashboard={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Đang học dữ liệu
          </span>
          <Badge className={getPhaseBadgeClass(EBotStatus.Indexing)}>
            {getPhaseLabel(EBotStatus.Indexing)}
          </Badge>
        </CardTitle>
        <CardDescription>Đang xử lý nội dung, chunking và tạo embeddings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {pipelineError && (
          <Alert variant="destructive">
            <AlertTitle>Indexing lỗi</AlertTitle>
            <AlertDescription>{pipelineError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 rounded-lg border p-4">
          <ElegantProgress
            title="Đang index dữ liệu..."
            currentAction={"Đang xử lý dữ liệu..."}
            progress={trackerCounts.percent}
            crawledCount={trackerCounts.completed}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>
              {trackerCounts.completed} / {trackerCounts.total} nguồn hoàn tất
            </span>
          </div>
          {trackerCounts.failed > 0 && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{trackerCounts.failed} nguồn lỗi</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
