"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Palette,
  Shield,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { AIConfigurator } from "@/components/shared/AIConfigurator";

interface Step2GlobalConfigProps {
  workspaceId: string;
}

export function Step2GlobalConfig({ workspaceId }: Step2GlobalConfigProps) {
  const t = useTranslations("onboarding.bulkSteps.step2");
  const [isLoadingDryRun, setIsLoadingDryRun] = useState(false);

  const bulkValidatedRows = useOnboardingStore((state) => state.bulkValidatedRows);
  const bulkConfig = useOnboardingStore((state) => state.bulkConfig);
  const bulkDryRunResult = useOnboardingStore((state) => state.bulkDryRunResult);
  const setBulkConfig = useOnboardingStore((state) => state.setBulkConfig);
  const setBulkDryRunResult = useOnboardingStore((state) => state.setBulkDryRunResult);
  const setBulkStep = useOnboardingStore((state) => state.setBulkStep);

  const validRows = useMemo(() => bulkValidatedRows.filter((r) => r.isValid), [bulkValidatedRows]);

  useEffect(() => {
    let isMounted = true;

    async function runDryRun() {
      if (validRows.length === 0) return;
      setIsLoadingDryRun(true);
      try {
        const res = await fetch("/api/bots/bulk-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            mode: "dry-run",
            template: bulkConfig,
            rawRows: validRows.map((r) => ({
              name: r.name,
              slug: r.slug,
              avatar_url: r.avatarUrl,
              knowledge_title: r.knowledgeTitle,
              knowledge_content: r.knowledgeContent,
            })),
          }),
        });

        const data = await res.json();
        if (isMounted && data.success && data.data) {
          setBulkDryRunResult(data.data);
        }
      } catch (err) {
        console.error("Dry run error:", err);
      } finally {
        if (isMounted) setIsLoadingDryRun(false);
      }
    }

    void runDryRun();
    return () => {
      isMounted = false;
    };
  }, [workspaceId, validRows, bulkConfig, setBulkDryRunResult]);

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description", { count: validRows.length })}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Global Config Card */}
        <div className="space-y-4 rounded-xl border p-5">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium">
                <Palette className="h-3.5 w-3.5 text-primary" />
                {t("primaryColor")}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={bulkConfig.primaryColor || "#3B82F6"}
                  onChange={(e) => setBulkConfig({ ...bulkConfig, primaryColor: e.target.value })}
                  className="h-10 w-16 cursor-pointer p-1"
                />
                <span className="font-mono text-xs font-medium uppercase">
                  {bulkConfig.primaryColor || "#3B82F6"}
                </span>
              </div>
            </div>

            {/* Public Mode Switch */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium">
                <Shield className="h-3.5 w-3.5 text-primary" />
                {t("accessControl")}
              </Label>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <span className="text-xs font-medium">
                  {bulkConfig.isPublic ? t("public") : t("private")}
                </span>
                <Switch
                  checked={bulkConfig.isPublic ?? false}
                  onCheckedChange={(checked) => setBulkConfig({ ...bulkConfig, isPublic: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reused AI Configurator Component (Personality & Skills) */}
        <AIConfigurator
          initialPersonalityId={bulkConfig.personalityId || null}
          initialSkillIds={bulkConfig.skillIds || []}
          onConfigChange={(personalityId, skillIds) => {
            setBulkConfig({
              ...bulkConfig,
              personalityId: personalityId || undefined,
              skillIds,
            });
          }}
          showSaveButton={false}
        />

        {/* Quota & Dry-Run Preview Warning if Blocked */}
        {bulkDryRunResult?.blocked && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{bulkDryRunResult.blockReason}</span>
          </div>
        )}

        {/* Footer Navigation & Credits Pill Box */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="inline-flex min-w-[250px] items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
            <div>
              <p className="text-[11px] tracking-wide text-muted-foreground">
                {t("creditsNeeded")}
              </p>
              <p className="text-xs font-medium text-foreground">
                {bulkDryRunResult ? bulkDryRunResult.credits.needed.toLocaleString() : 0} credits
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <p className="text-xs text-muted-foreground">
              {bulkDryRunResult
                ? t("quotaAvailable", {
                    remaining: bulkDryRunResult.quota.remaining,
                    limit: bulkDryRunResult.quota.botsLimit,
                  })
                : t("checking")}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkStep(1)}
              className="hover:border-primary hover:bg-white hover:text-primary sm:min-w-[140px]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("back")}
            </Button>
            <Button
              onClick={() => setBulkStep(3)}
              disabled={
                isLoadingDryRun || Boolean(bulkDryRunResult?.blocked) || validRows.length === 0
              }
              className="sm:min-w-[160px]"
            >
              {isLoadingDryRun ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("checking")}
                </>
              ) : (
                <>
                  {t("createBots", { count: validRows.length })}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
