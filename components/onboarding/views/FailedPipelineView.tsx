"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EBotStatus } from "@/types";
import { getPhaseBadgeClass, getPhaseLabel } from "@/components/onboarding/utils";

export interface FailedPipelineViewProps {
  pipelineError: string | null;
  onRetry: () => void;
  onBackToDashboard: () => void;
}

export function FailedPipelineView({
  pipelineError,
  onRetry,
  onBackToDashboard,
}: FailedPipelineViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Pipeline thất bại
          </span>
          <Badge className={getPhaseBadgeClass(EBotStatus.Failed)}>
            {getPhaseLabel(EBotStatus.Failed)}
          </Badge>
        </CardTitle>
        <CardDescription>Đã xảy ra lỗi khi xử lý dữ liệu website.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Alert variant="destructive">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{pipelineError || "Không thể hoàn tất pipeline."}</AlertDescription>
        </Alert>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onRetry}>
            Thử lại Discover
          </Button>
          <Button onClick={onBackToDashboard}>Về Dashboard</Button>
        </div>
      </CardContent>
    </Card>
  );
}
