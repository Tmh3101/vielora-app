"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Step1CSVUpload } from "@/components/onboarding/bulk-steps/Step1CSVUpload";
import { Step2GlobalConfig } from "@/components/onboarding/bulk-steps/Step2GlobalConfig";
import { Step3RealtimeProgress } from "@/components/onboarding/bulk-steps/Step3RealtimeProgress";
import { Step4CompletionReport } from "@/components/onboarding/bulk-steps/Step4CompletionReport";

export function BulkOnboardingWizard(_props: { userId?: string }) {
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id ?? null;

  const bulkStep = useOnboardingStore((state) => state.bulkStep);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-14">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex cursor-pointer items-center transition-opacity hover:opacity-80"
          >
            <Image
              src="/images/logo-full.png"
              alt="Vielora"
              width={640}
              height={160}
              className="h-28 w-auto"
              priority
            />
          </button>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Tạo chatbot hàng loạt</h1>
          <p className="text-muted-foreground">
            Tải file CSV và thiết lập nhanh danh sách chatbot của bạn
          </p>
        </div>

        {/* 4 Step Stepper Bar */}
        <div className="mb-12 flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold sm:h-10 sm:w-10 ${
                  bulkStep >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {bulkStep > s ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`mx-1 h-1 w-12 rounded sm:w-16 ${
                    bulkStep > s ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Render Step Components */}
        {bulkStep === 1 && <Step1CSVUpload workspaceId={workspaceId} />}
        {bulkStep === 2 &&
          (workspaceId ? (
            <Step2GlobalConfig workspaceId={workspaceId} />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 py-16 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm">Đang tải thông tin Workspace...</p>
            </div>
          ))}
        {bulkStep === 3 &&
          (workspaceId ? (
            <Step3RealtimeProgress workspaceId={workspaceId} />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 py-16 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm">Đang tải thông tin Workspace...</p>
            </div>
          ))}
        {bulkStep === 4 && <Step4CompletionReport />}
      </div>
    </div>
  );
}
