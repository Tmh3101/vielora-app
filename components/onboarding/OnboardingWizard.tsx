"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { deleteBot } from "@/lib/services/bot.service";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Step1CreateBot } from "@/components/onboarding/steps/Step1CreateBot";
import { Step2CuratePages } from "@/components/onboarding/steps/Step2CuratePages";
import { Step2UploadFiles } from "@/components/onboarding/steps/Step2UploadFiles";
import { Step3Indexing } from "@/components/onboarding/steps/Step3Indexing";
import { Step4Success } from "@/components/onboarding/steps/Step4Success";
import { LogoLoader } from "@/components/ui/logo-loader";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { EBotStatus } from "@/types";
import { getStepForBotStatus } from "@/lib/helpers";
import { ONBOARDING_RESTORE_KEY } from "@/lib/constants/react-query-key";
import { ONBOARDING_SOURCE_MODE, type OnboardingSourceMode } from "@/lib/constants";

export interface OnboardingWizardProps {
  userId: string;
}

interface RestoredBotState {
  id: string;
  status: EBotStatus;
  sourceMode: OnboardingSourceMode;
}

interface RestoredBotRow {
  id: string;
  status: EBotStatus | null;
  crawl_settings: unknown;
}

export function OnboardingWizard({ userId }: OnboardingWizardProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const step = useOnboardingStore((state) => state.step);
  const botId = useOnboardingStore((state) => state.botId);
  const sourceMode = useOnboardingStore((state) => state.sourceMode);
  const hasHydrated = useOnboardingStore((state) => state.hasHydrated);
  const setStep = useOnboardingStore((state) => state.setStep);
  const setBotId = useOnboardingStore((state) => state.setBotId);
  const reset = useOnboardingStore((state) => state.reset);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const onboardingUrlRef = useRef<string>("");

  useEffect(() => {
    if (!(step > 1 && !!botId)) return;

    onboardingUrlRef.current = window.location.href;

    const handlePopState = () => {
      setShowExitDialog(true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [step, botId]);

  const restoredBotQuery = useQuery({
    queryKey: [ONBOARDING_RESTORE_KEY, userId, botId],
    queryFn: async (): Promise<RestoredBotState | null> => {
      if (!botId) return null;
      const { data, error } = await supabase
        .from("bots")
        .select("id, status, user_id, crawl_settings")
        .eq("id", botId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      const botData = data as unknown as RestoredBotRow;
      return {
        id: botData.id,
        status: botData.status ?? EBotStatus.Pending,
        sourceMode: getSourceModeFromCrawlSettings(botData.crawl_settings),
      };
    },
    enabled: hasHydrated && !!botId,
    retry: 1,
  });

  const handleCreated = (nextBotId: string, status = EBotStatus.Discovering) => {
    queryClient.removeQueries({ queryKey: [ONBOARDING_RESTORE_KEY, userId] });
    queryClient.setQueryData<RestoredBotState>([ONBOARDING_RESTORE_KEY, userId, nextBotId], {
      id: nextBotId,
      status,
      sourceMode,
    });
    setBotId(nextBotId);
    setStep(2);
  };

  const handleStartIndex = () => {
    if (effectiveBotId) {
      queryClient.setQueryData<RestoredBotState>([ONBOARDING_RESTORE_KEY, userId, effectiveBotId], {
        id: effectiveBotId,
        status: EBotStatus.Indexing,
        sourceMode: effectiveSourceMode,
      });
    }
    setStep(3);
  };

  const handleIndexDone = () => {
    if (effectiveBotId) {
      queryClient.setQueryData<RestoredBotState>([ONBOARDING_RESTORE_KEY, userId, effectiveBotId], {
        id: effectiveBotId,
        status: EBotStatus.Ready,
        sourceMode: effectiveSourceMode,
      });
    }
    setStep(4);
  };

  const handleExitNavigation = () => {
    const active = effectiveStep > 1 && !!effectiveBotId;
    if (active) {
      setShowExitDialog(true);
    } else {
      router.push("/dashboard");
    }
  };

  const handleExitConfirm = async () => {
    setShowExitDialog(false);
    if (effectiveBotId) {
      try {
        await deleteBot(supabase, effectiveBotId);
      } catch {
        toast({
          title: "Lỗi",
          description: "Không thể xóa bot. Vui lòng thử lại.",
          variant: "destructive",
        });
      }
    }
    queryClient.removeQueries({ queryKey: [ONBOARDING_RESTORE_KEY, userId] });
    reset();
    router.push("/dashboard");
  };

  const handleDialogCancel = () => {
    if (window.location.href !== onboardingUrlRef.current) {
      window.history.pushState(null, "", onboardingUrlRef.current);
    }
  };

  if (!hasHydrated || (!!botId && restoredBotQuery.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LogoLoader size={60} />
      </div>
    );
  }

  const restoredBot = restoredBotQuery.data ?? null;
  const effectiveSourceMode = restoredBot?.sourceMode ?? sourceMode;
  const effectiveBotId =
    botId && (!restoredBotQuery.isFetched || restoredBotQuery.isError || restoredBot)
      ? botId
      : null;
  const effectiveStep =
    botId && restoredBotQuery.isFetched && !restoredBotQuery.isError && !restoredBot
      ? 1
      : effectiveBotId && restoredBot
        ? getStepForBotStatus(restoredBot.status, step)
        : step;
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-14">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <button
            type="button"
            onClick={handleExitNavigation}
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
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Tạo chatbot cho website của bạn
          </h1>
          <p className="text-muted-foreground">Chỉ mất vài phút để có chatbot AI thông minh</p>
        </div>

        <div className="mb-12 flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold sm:h-10 sm:w-10 ${
                  effectiveStep >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {effectiveStep > s ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`mx-1 h-1 w-12 rounded sm:w-16 ${
                    effectiveStep > s ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {effectiveStep === 1 && <Step1CreateBot userId={userId} onNext={handleCreated} />}

        {effectiveStep === 2 &&
          effectiveBotId &&
          effectiveSourceMode === ONBOARDING_SOURCE_MODE.WEBSITE && (
            <Step2CuratePages botId={effectiveBotId} onNext={handleStartIndex} />
          )}

        {effectiveStep === 2 &&
          effectiveBotId &&
          effectiveSourceMode === ONBOARDING_SOURCE_MODE.FILES && (
            <Step2UploadFiles botId={effectiveBotId} onNext={handleStartIndex} />
          )}

        {effectiveStep === 3 && effectiveBotId && (
          <Step3Indexing botId={effectiveBotId} onDone={handleIndexDone} />
        )}

        {effectiveStep === 4 && effectiveBotId && <Step4Success botId={effectiveBotId} />}
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời khỏi quá trình tạo chatbot?</AlertDialogTitle>
            <AlertDialogDescription>
              Tiến trình tạo bot hiện tại sẽ bị hủy và bot sẽ bị xóa. Bạn có chắc chắn muốn rời
              khỏi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="hover:border-primary hover:bg-white hover:text-primary"
              onClick={handleDialogCancel}
            >
              Ở lại
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleExitConfirm}
            >
              Xóa và rời khỏi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getSourceModeFromCrawlSettings(value: unknown): OnboardingSourceMode {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const sourceMode = (value as Record<string, unknown>).onboardingSourceMode;
    if (sourceMode === ONBOARDING_SOURCE_MODE.FILES) {
      return ONBOARDING_SOURCE_MODE.FILES;
    }
  }

  return ONBOARDING_SOURCE_MODE.WEBSITE;
}
