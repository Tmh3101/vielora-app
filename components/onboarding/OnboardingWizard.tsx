"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Step1CreateBot } from "@/components/onboarding/steps/Step1CreateBot";
import { Step2CuratePages } from "@/components/onboarding/steps/Step2CuratePages";
import { Step3Indexing } from "@/components/onboarding/steps/Step3Indexing";
import { Step4Success } from "@/components/onboarding/steps/Step4Success";
import { useOnboardingStore } from "@/store/useOnboardingStore";

export interface OnboardingWizardProps {
  userId: string;
}

export function OnboardingWizard({ userId }: OnboardingWizardProps) {
  const step = useOnboardingStore((state) => state.step);
  const botId = useOnboardingStore((state) => state.botId);
  const setStep = useOnboardingStore((state) => state.setStep);
  const setBotId = useOnboardingStore((state) => state.setBotId);
  const reset = useOnboardingStore((state) => state.reset);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleCreated = (nextBotId: string) => {
    setBotId(nextBotId);
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-14">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center transition-opacity hover:opacity-80"
          >
            <Image
              src="/images/logo-full.png"
              alt="Vielora"
              width={640}
              height={160}
              className="h-28 w-auto"
              priority
            />
          </Link>
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
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`mx-1 h-1 w-12 rounded sm:w-16 ${
                    step > s ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {step === 1 && <Step1CreateBot userId={userId} onNext={handleCreated} />}

        {step === 2 && botId && <Step2CuratePages botId={botId} onNext={() => setStep(3)} />}

        {step === 3 && botId && <Step3Indexing botId={botId} onDone={() => setStep(4)} />}

        {step === 4 && botId && <Step4Success botId={botId} />}
      </div>
    </div>
  );
}
