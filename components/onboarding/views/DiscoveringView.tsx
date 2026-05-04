"use client";

import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EBotStatus } from "@/types";
import { getPhaseBadgeClass, getPhaseLabel } from "@/components/onboarding/utils";

export interface DiscoveringViewProps {
  trainingProgress: number;
  pipelineError: string | null;
  pagesFailed: number;
}

export function DiscoveringView({
  trainingProgress,
  pipelineError,
  pagesFailed,
}: DiscoveringViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Đang khám phá cấu trúc website
          </span>
          <Badge className={getPhaseBadgeClass(EBotStatus.Discovering)}>
            {getPhaseLabel(EBotStatus.Discovering)}
          </Badge>
        </CardTitle>
        <CardDescription>Đang quét và thu thập dữ liệu từ website</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {pipelineError && (
          <Alert variant="destructive">
            <AlertTitle>Discover thất bại</AlertTitle>
            <AlertDescription>{pipelineError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Đang thu thập dữ liệu và xử lý. Vui lòng đợi...
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <Progress value={trainingProgress} className="h-2" />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {pagesFailed > 0 && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{pagesFailed} trang lỗi trong quá trình discover</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
