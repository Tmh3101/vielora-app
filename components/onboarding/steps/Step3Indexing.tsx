"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, BrainCircuit, CheckCircle } from "lucide-react";
import { useIndexingPipeline } from "@/hooks/onboarding/useIndexingPipeline";
import { FailedPipelineView } from "@/components/onboarding/views/FailedPipelineView";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { EBotStatus } from "@/types";
import { getPhaseBadgeClass, getPhaseLabel } from "@/components/onboarding/utils";

export interface Step3IndexingProps {
  botId: string;
  onDone: () => void;
}

export function Step3Indexing({ botId, onDone }: Step3IndexingProps) {
  const router = useRouter();
  const { botStatus, pipelineError, counts } = useIndexingPipeline(botId, { onDone });

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

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Tiến độ {counts.completed}/{counts.total || 0} trang
            </span>
            <span className="font-medium">{counts.percent}%</span>
          </div>
          <Progress value={counts.percent} className="h-3" />
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{counts.completed} trang hoàn tất</span>
          </div>
          {counts.failed > 0 && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{counts.failed} trang lỗi</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
