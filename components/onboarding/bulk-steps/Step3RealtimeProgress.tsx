"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ElegantProgress } from "@/components/onboarding/shared/ElegantProgress";
import { BrainCircuit, CheckCircle, AlertCircle } from "lucide-react";
import { EBotStatus } from "@/types";
import { getPhaseBadgeClass, getPhaseLabel } from "@/components/onboarding/utils";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { BULK_IMPORT_SUB_BATCH_SIZE } from "@/lib/constants/bulk-import";
import type { BulkRowResult } from "@/lib/services/bulk-bot.service";

interface Step3RealtimeProgressProps {
  workspaceId: string;
}
export function Step3RealtimeProgress({ workspaceId }: Step3RealtimeProgressProps) {
  const [createdCount, setCreatedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [currentBotName, setCurrentBotName] = useState<string>("");
  const isExecutingRef = useRef(false);

  const bulkValidatedRows = useOnboardingStore((state) => state.bulkValidatedRows);
  const bulkConfig = useOnboardingStore((state) => state.bulkConfig);
  const setBulkResults = useOnboardingStore((state) => state.setBulkResults);
  const setBulkStep = useOnboardingStore((state) => state.setBulkStep);

  const validRows = bulkValidatedRows.filter((r) => r.isValid);
  const total = validRows.length;

  useEffect(() => {
    if (isExecutingRef.current || total === 0) return;
    isExecutingRef.current = true;

    async function processSubBatches() {
      const allResults: BulkRowResult[] = [];
      let successCounter = 0;
      let failCounter = 0;

      // Sub-batch chunking
      for (let i = 0; i < validRows.length; i += BULK_IMPORT_SUB_BATCH_SIZE) {
        const chunk = validRows.slice(i, i + BULK_IMPORT_SUB_BATCH_SIZE);
        setCurrentBotName(chunk[0]?.name || "");

        try {
          const res = await fetch("/api/bots/bulk-create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId,
              mode: "create",
              template: bulkConfig,
              rows: chunk.map((r) => ({
                name: r.name,
                slug: r.slug,
                avatarUrl: r.avatarUrl,
                knowledgeTitle: r.knowledgeTitle,
                knowledgeContent: r.knowledgeContent,
              })),
            }),
          });

          const json = await res.json();
          if (json.success && json.data?.results) {
            const batchResults: BulkRowResult[] = json.data.results;
            allResults.push(...batchResults);

            batchResults.forEach((r) => {
              if (r.status === "created") successCounter += 1;
              else failCounter += 1;
            });
          } else {
            chunk.forEach((r, idx) => {
              failCounter += 1;
              allResults.push({
                index: i + idx,
                name: r.name,
                slug: r.slug,
                status: "error",
                errorReason: json.message || "Lỗi tạo batch",
              });
            });
          }
        } catch (err) {
          chunk.forEach((r, idx) => {
            failCounter += 1;
            allResults.push({
              index: i + idx,
              name: r.name,
              slug: r.slug,
              status: "error",
              errorReason: err instanceof Error ? err.message : "Network error",
            });
          });
        }

        setCreatedCount(successCounter);
        setFailedCount(failCounter);
      }

      setBulkResults(allResults);
      setTimeout(() => {
        setBulkStep(4);
      }, 800);
    }

    void processSubBatches();
  }, [workspaceId, total, validRows, bulkConfig, setBulkResults, setBulkStep]);

  const processedCount = createdCount + failedCount;
  const percent = total > 0 ? Math.round((processedCount / total) * 100) : 0;

  return (
    <Card className="mx-auto max-w-4xl">
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
        <CardDescription>
          Đang xử lý khởi tạo bot, chunking và nạp kiến thức ban đầu.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border p-4">
          <ElegantProgress
            title="Đang khởi tạo chatbot hàng loạt..."
            currentAction={currentBotName ? `Đang xử lý: "${currentBotName}"` : "Đang kết nối..."}
            progress={percent}
            crawledCount={createdCount}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>
              {createdCount} / {total} bot hoàn tất
            </span>
          </div>
          {failedCount > 0 && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{failedCount} bot gặp lỗi</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
