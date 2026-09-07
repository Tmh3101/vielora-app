"use client";

import { useTranslations } from "next-intl";
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
  progress: number;
  scopeLabel: string;
}

export function DiscoveringView({
  pipelineError,
  pagesFailed,
  currentAction,
  crawledCount,
  progress,
  scopeLabel,
}: DiscoveringViewProps) {
  const t = useTranslations("onboarding.views.discovering");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("title")}
          </span>
          <Badge className={getPhaseBadgeClass(EBotStatus.Discovering)}>
            {getPhaseLabel(EBotStatus.Discovering)}
          </Badge>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          {t("scopePrefix")}: <span className="font-medium text-foreground">{scopeLabel}</span>
        </div>

        {pipelineError && (
          <Alert variant="destructive">
            <AlertTitle>{t("failedTitle")}</AlertTitle>
            <AlertDescription>{pipelineError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 rounded-lg border p-4">
          <ElegantProgress
            title={t("progressTitle")}
            currentAction={currentAction || t("defaultAction")}
            crawledCount={crawledCount}
            progress={progress}
          />
        </div>

        {pagesFailed > 0 && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{t("failedPagesCount", { count: pagesFailed })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
