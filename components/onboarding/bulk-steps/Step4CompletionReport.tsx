"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, RefreshCw, Bot, ArrowRight } from "lucide-react";
import { useOnboardingStore } from "@/store/useOnboardingStore";

export function Step4CompletionReport() {
  const t = useTranslations("onboarding.bulkSteps.step4");
  const router = useRouter();

  const bulkResults = useOnboardingStore((state) => state.bulkResults);
  const bulkValidatedRows = useOnboardingStore((state) => state.bulkValidatedRows);
  const setBulkValidatedRows = useOnboardingStore((state) => state.setBulkValidatedRows);
  const setBulkStep = useOnboardingStore((state) => state.setBulkStep);
  const reset = useOnboardingStore((state) => state.reset);

  const successCount = bulkResults.filter((r) => r.status === "created").length;
  const failedResults = bulkResults.filter((r) => r.status === "error");
  const failedCount = failedResults.length;
  const totalCount = bulkResults.length;

  const handleReimportFailed = () => {
    const failedSlugs = new Set(failedResults.map((r) => r.slug));
    const retryRows = bulkValidatedRows.filter((r) => failedSlugs.has(r.slug));

    setBulkValidatedRows(retryRows);
    setBulkStep(1);
  };

  const handleFinish = () => {
    reset();
    router.push("/dashboard");
  };

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description", { successCount, totalCount })}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bot Preview Card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className="bg-primary">
                  <Bot className="h-6 w-6 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">
                  {t("botsCompleted", { count: successCount })}
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {t("knowledgeIngested")}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
              {t("botsBadge", { count: successCount })}
            </Badge>
          </div>
        </div>

        {/* Failed Details Table if any */}
        {failedCount > 0 && (
          <div className="space-y-3 rounded-xl border border-destructive/20 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {t("failedRowsTitle", { count: failedCount })}
            </h3>
            <div className="max-h-52 overflow-y-auto rounded-lg border text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted p-2 font-medium">
                  <tr>
                    <th className="p-2">{t("colIndex")}</th>
                    <th className="p-2">{t("colBotName")}</th>
                    <th className="p-2">{t("colSlug")}</th>
                    <th className="p-2">{t("colReason")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {failedResults.map((r, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono">{idx + 1}</td>
                      <td className="p-2 font-medium">{r.name}</td>
                      <td className="p-2 font-mono text-muted-foreground">{r.slug}</td>
                      <td className="p-2 text-destructive">
                        {r.errorReason || t("defaultInitError")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          {failedCount > 0 ? (
            <Button
              variant="outline"
              onClick={handleReimportFailed}
              className="hover:border-primary hover:bg-white hover:text-primary"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("retryFailed", { count: failedCount })}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleFinish}
              className="hover:border-primary hover:bg-white hover:text-primary"
            >
              {t("backToDashboard")}
            </Button>
          )}
          <Button onClick={handleFinish}>
            {t("finishAndConfigure")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
