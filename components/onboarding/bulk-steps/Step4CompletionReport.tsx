"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, RefreshCw, Bot, ArrowRight } from "lucide-react";
import { useOnboardingStore } from "@/store/useOnboardingStore";

export function Step4CompletionReport() {
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
        <CardTitle>Danh sách Chatbot đã sẵn sàng!</CardTitle>
        <CardDescription>
          Đã khởi tạo thành công {successCount}/{totalCount} chatbot từ file CSV của bạn.
        </CardDescription>
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
                <p className="font-semibold text-foreground">{successCount} Chatbot hoàn tất</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Đã nạp kiến thức ban đầu
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
              {successCount} bots
            </Badge>
          </div>
        </div>

        {/* Failed Details Table if any */}
        {failedCount > 0 && (
          <div className="space-y-3 rounded-xl border border-destructive/20 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              Danh sách dòng bị lỗi ({failedCount}):
            </h3>
            <div className="max-h-52 overflow-y-auto rounded-lg border text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted p-2 font-medium">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Tên Bot</th>
                    <th className="p-2">Slug</th>
                    <th className="p-2">Lý do lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {failedResults.map((r, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono">{idx + 1}</td>
                      <td className="p-2 font-medium">{r.name}</td>
                      <td className="p-2 font-mono text-muted-foreground">{r.slug}</td>
                      <td className="p-2 text-destructive">{r.errorReason || "Lỗi khởi tạo"}</td>
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
              Nhập lại dòng lỗi ({failedCount})
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleFinish}
              className="hover:border-primary hover:bg-white hover:text-primary"
            >
              Trở về Dashboard
            </Button>
          )}
          <Button onClick={handleFinish}>
            Hoàn tất & Cài đặt Widget
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
