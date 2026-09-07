"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("onboarding.views.failed");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("title")}
          </span>
          <Badge className={getPhaseBadgeClass(EBotStatus.Failed)}>
            {getPhaseLabel(EBotStatus.Failed)}
          </Badge>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{pipelineError || t("defaultError")}</AlertDescription>
        </Alert>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            className="hover:border-primary hover:bg-white hover:text-primary"
            onClick={onRetry}
          >
            {t("retryDiscover")}
          </Button>
          <Button onClick={onBackToDashboard}>{t("backToDashboard")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
