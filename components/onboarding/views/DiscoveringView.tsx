"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EBotStatus } from "@/types";
import { getPhaseBadgeClass, getPhaseLabel } from "@/components/onboarding/utils";
import { ElegantProgress } from "@/components/onboarding/shared/ElegantProgress";

export interface DiscoveringViewProps {
  pipelineError: string | null;
  pagesFailed: number;
  currentAction: string;
  crawledCount: number;
  scopeLabel: string;
}

export function DiscoveringView({
  pipelineError,
  pagesFailed,
  currentAction,
  crawledCount,
  scopeLabel,
}: DiscoveringViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Crawl dữ liệu từ website
          </span>
          <Badge className={getPhaseBadgeClass(EBotStatus.Discovering)}>
            {getPhaseLabel(EBotStatus.Discovering)}
          </Badge>
        </CardTitle>
        <CardDescription>Đang quét và thu thập dữ liệu từ website</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Phạm vi: <span className="font-medium text-foreground">{scopeLabel}</span>
        </div>

        {pipelineError && (
          <Alert variant="destructive">
            <AlertTitle>Discover thất bại</AlertTitle>
            <AlertDescription>{pipelineError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 rounded-lg border p-4">
          <ElegantProgress
            title="Đang thu thập dữ liệu..."
            currentAction={currentAction || "Đang kiểm tra các trang để thu thập dữ liệu..."}
            crawledCount={crawledCount}
          />
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
