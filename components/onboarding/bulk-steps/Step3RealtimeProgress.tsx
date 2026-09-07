"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, BrainCircuit } from "lucide-react";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { ElegantProgress } from "@/components/onboarding/shared/ElegantProgress";
import { EBotStatus } from "@/types";
import { getPhaseBadgeClass, getPhaseLabel } from "@/components/onboarding/utils";
import type { BulkRowResult } from "@/lib/services/bulk-bot.service";

interface Step3RealtimeProgressProps {
  workspaceId: string;
}

export function Step3RealtimeProgress({ workspaceId }: Step3RealtimeProgressProps) {
  const t = useTranslations("onboarding.bulkSteps.step3");
  const [createdCount, setCreatedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [currentBotName, setCurrentBotName] = useState<string | null>(null);

  const bulkValidatedRows = useOnboardingStore((state) => state.bulkValidatedRows);
  const bulkConfig = useOnboardingStore((state) => state.bulkConfig);
  const setBulkResults = useOnboardingStore((state) => state.setBulkResults);
  const setBulkStep = useOnboardingStore((state) => state.setBulkStep);

  const validRows = bulkValidatedRows.filter((r) => r.isValid);
  const total = validRows.length;

  useEffect(() => {
    let isCancelled = false;

    async function processSubBatches() {
      const SUB_BATCH_SIZE = 5;
      const allResults: BulkRowResult[] = [];

      for (let i = 0; i < validRows.length; i += SUB_BATCH_SIZE) {
        if (isCancelled) break;

        const subBatch = validRows.slice(i, i + SUB_BATCH_SIZE);
        setCurrentBotName(subBatch.map((b) => b.name).join(", "));

        try {
          const res = await fetch("/api/bots/bulk-create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId,
              mode: "commit",
              template: bulkConfig,
              rawRows: subBatch.map((r) => ({
                name: r.name,
                slug: r.slug,
                avatar_url: r.avatarUrl,
                knowledge_title: r.knowledgeTitle,
                knowledge_content: r.knowledgeContent,
              })),
            }),
          });

          const data = await res.json();
          if (data.success && data.data?.rows) {
            const rowsRes = data.data.rows as BulkRowResult[];
            allResults.push(...rowsRes);

            const successInBatch = rowsRes.filter((r) => r.status === "created").length;
            const failedInBatch = rowsRes.filter((r) => r.status === "error").length;

            setCreatedCount((prev) => prev + successInBatch);
            setFailedCount((prev) => prev + failedInBatch);
          } else {
            // Whole sub-batch failed
            const fallbackErrors: BulkRowResult[] = subBatch.map((sb, idx) => ({
              index: i + idx,
              slug: sb.slug,
              name: sb.name,
              status: "error",
              errorReason: data.message || "Failed sub-batch execution",
            }));
            allResults.push(...fallbackErrors);
            setFailedCount((prev) => prev + subBatch.length);
          }
        } catch (err) {
          console.error("Sub batch error:", err);
          const fallbackErrors: BulkRowResult[] = subBatch.map((sb, idx) => ({
            index: i + idx,
            slug: sb.slug,
            name: sb.name,
            status: "error",
            errorReason: err instanceof Error ? err.message : "Network/execution error",
          }));
          allResults.push(...fallbackErrors);
          setFailedCount((prev) => prev + subBatch.length);
        }

        // Small interval to let React render progress updates smoothly
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setBulkResults(allResults);
      setTimeout(() => {
        setBulkStep(4);
      }, 800);
    }

    void processSubBatches();
    return () => {
      isCancelled = true;
    };
  }, [workspaceId, total, validRows, bulkConfig, setBulkResults, setBulkStep]);

  const processedCount = createdCount + failedCount;
  const percent = total > 0 ? Math.round((processedCount / total) * 100) : 0;

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            {t("title")}
          </span>
          <Badge className={getPhaseBadgeClass(EBotStatus.Indexing)}>
            {getPhaseLabel(EBotStatus.Indexing)}
          </Badge>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border p-4">
          <ElegantProgress
            title={t("progressTitle")}
            currentAction={
              currentBotName ? t("processingBot", { name: currentBotName }) : t("connecting")
            }
            progress={percent}
            crawledCount={createdCount}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{t("botsCompleted", { createdCount, total })}</span>
          </div>
          {failedCount > 0 && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{t("botsFailed", { count: failedCount })}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
