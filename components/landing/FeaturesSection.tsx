"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { FEATURES } from "@/lib/constants";
import { MockupCrawl } from "./features/MockupCrawl";
import { MockupAICustomize } from "./features/MockupAICustomize";
import { MockupSmartHomepage } from "./features/MockupSmartHomepage";
import { MockupGroupChat } from "./features/MockupGroupChat";
import { MockupIntegration } from "./features/MockupIntegration";
import { MockupPWA } from "./features/MockupPWA";
import { MockupLeadForm } from "./features/MockupLeadForm";
import { MockupAnalytics } from "./features/MockupAnalytics";

const MOCKUPS: Record<number, React.ComponentType> = {
  0: MockupCrawl,
  1: MockupAICustomize,
  2: MockupSmartHomepage,
  3: MockupGroupChat,
  4: MockupIntegration,
  5: MockupPWA,
  6: MockupLeadForm,
  7: MockupAnalytics,
};

const STEP_DURATION_MS = 3200; // 3.2 seconds per feature for snappy, engaging showcase

export default function FeaturesSection() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const totalSteps = FEATURES.length;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Advance to next step (strictly sequential: 0 -> 1 -> 2 -> ... -> 7 -> 0)
  const handleNext = useCallback(() => {
    setCurrentStep((prev) => (prev + 1) % totalSteps);
  }, [totalSteps]);

  // Jump directly to specific step
  const jumpToStep = useCallback((index: number) => {
    setCurrentStep(index);
  }, []);

  // Dedicated single-timer auto loop (prevents multiple triggers / skipping)
  useEffect(() => {
    if (shouldReduceMotion || isHovered) return;

    timerRef.current = setTimeout(() => {
      handleNext();
    }, STEP_DURATION_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentStep, isHovered, handleNext, shouldReduceMotion]);

  const ActiveMockup = MOCKUPS[currentStep] || MOCKUPS[0];

  return (
    <section
      id="features"
      className="relative scroll-mt-24 overflow-hidden bg-card/50 py-14 lg:py-20"
    >
      {/* Background ambient accents */}
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-[0.12]" />
      <div className="dot-pattern pointer-events-none absolute inset-0 opacity-30" />
      <div className="orb orb-primary -right-32 -top-32 h-72 w-72 opacity-30" />
      <div className="orb orb-accent -bottom-24 -left-24 h-60 w-60 opacity-25" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-8 max-w-3xl text-center lg:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>TÍNH NĂNG ĐỘT PHÁ</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="heading-premium mb-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl"
          >
            Giải pháp <span className="text-gradient-animated text-balance">chatbot</span> toàn diện
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="text-balance text-xs text-muted-foreground sm:text-sm"
          >
            Từ việc tự động học kiến thức đến mở rộng điểm chạm và tối ưu chuyển đổi, tất cả đã sẵn
            sàng
          </motion.p>
        </div>

        {/* ── DESKTOP VIEW (>= lg) ── */}
        <div
          className="hidden lg:grid lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-8 xl:gap-10"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Column 1: Mockup Viewport */}
          <div className="flex items-center justify-center">
            <div
              className="relative h-[29rem] w-full max-w-xl overflow-visible"
              style={{ perspective: 1200 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  className="absolute inset-0 flex items-center justify-center"
                  initial={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : {
                          opacity: 0,
                          scale: 0.95,
                          y: 14,
                          rotateY: 4,
                          filter: "blur(4px)",
                        }
                  }
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    rotateY: 0,
                    filter: "blur(0px)",
                  }}
                  exit={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : {
                          opacity: 0,
                          scale: 0.95,
                          y: -14,
                          rotateY: -4,
                          filter: "blur(4px)",
                        }
                  }
                  transition={{
                    type: "spring",
                    stiffness: 170,
                    damping: 24,
                    mass: 0.7,
                  }}
                >
                  <ActiveMockup />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Column 2: Slim Timeline Indicator */}
          <div className="flex flex-col items-center">
            <div className="relative flex h-[28rem] flex-col items-center justify-between py-2">
              {/* Vertical connector line */}
              <span className="absolute left-1/2 top-2 h-[calc(100%-1rem)] w-0.5 -translate-x-1/2 rounded-full bg-border/40" />

              {/* Glowing active progress line */}
              <motion.span
                className="absolute left-1/2 top-2 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-primary via-primary/80 to-primary/40"
                animate={{
                  height: `${(currentStep / (totalSteps - 1)) * 100}%`,
                }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />

              {FEATURES.map((_, i) => {
                const isActive = i <= currentStep;
                const isCurrent = i === currentStep;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => jumpToStep(i)}
                    aria-label={`Chuyển đến tính năng ${i + 1}`}
                    className={`relative z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-all duration-300 hover:scale-125 active:scale-95 ${
                      isActive
                        ? "border-primary bg-primary ring-4 ring-primary/20"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    {isCurrent && (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-primary/40"
                        animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 3: Compact & Smooth Feature Cards */}
          <div className="flex flex-col gap-1.5">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              const isCurrent = index === currentStep;

              return (
                <div
                  key={index}
                  onClick={() => jumpToStep(index)}
                  className={`group relative cursor-pointer overflow-hidden transition-all duration-300 ${
                    isCurrent
                      ? "rounded-xl border border-primary/40 bg-primary/[0.04] p-3 shadow-md shadow-primary/5 ring-1 ring-primary/20"
                      : "rounded-lg border border-border/30 bg-card/30 px-3 py-2 hover:border-border/70 hover:bg-card/60"
                  }`}
                >
                  {/* Active Step Top Progress Bar with smooth animation */}
                  {isCurrent && !shouldReduceMotion && !isHovered && (
                    <div className="absolute left-0 top-0 h-0.5 w-full bg-primary/20">
                      <motion.div
                        key={currentStep}
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: STEP_DURATION_MS / 1000, ease: "linear" }}
                        className="h-full bg-primary"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex shrink-0 items-center justify-center rounded-lg transition-all duration-300 ${
                        isCurrent
                          ? "h-7 w-7 bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                          : "h-6 w-6 bg-muted/70 text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <Icon className={isCurrent ? "h-3.5 w-3.5" : "h-3 w-3"} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {feature.tag && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                              isCurrent
                                ? "bg-primary/15 text-primary"
                                : "bg-muted/60 text-muted-foreground/80"
                            }`}
                          >
                            {feature.tag}
                          </span>
                        )}
                        <h3
                          className={`truncate text-xs tracking-tight transition-colors ${
                            isCurrent
                              ? "font-bold text-foreground"
                              : "font-medium text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          {feature.headline}
                        </h3>
                      </div>

                      <AnimatePresence initial={false}>
                        {isCurrent && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="pt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                              {feature.description}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <ChevronRight
                      className={`shrink-0 transition-transform duration-300 ${
                        isCurrent
                          ? "h-3.5 w-3.5 rotate-90 text-primary"
                          : "h-3 w-3 text-muted-foreground/30 group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── MOBILE / TABLET VIEW (< lg) ── */}
        <div
          className="flex flex-col lg:hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Progress Indicators */}
          <div className="mx-auto mb-5 w-full max-w-sm px-4">
            <div className="relative flex items-center justify-between">
              <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-border/30" />
              <motion.span
                className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary/40"
                animate={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => jumpToStep(i)}
                  aria-label={`Tính năng ${i + 1}`}
                  className="relative z-10 flex h-6 w-6 items-center justify-center"
                >
                  <span
                    className={`rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? "h-2.5 w-2.5 scale-125 bg-primary ring-4 ring-primary/20"
                        : i < currentStep
                          ? "h-2 w-2 bg-primary/60"
                          : "h-2 w-2 bg-border"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Active Mockup */}
          <div className="flex min-h-[300px] items-center justify-center px-2 sm:min-h-[340px]">
            <div className="w-full max-w-md">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <ActiveMockup />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Active Feature Card */}
          <div className="mt-3 px-2">
            <div className="mx-auto max-w-md">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="card-feature border-border/60 bg-card/70 p-3.5 shadow-sm"
                >
                  {(() => {
                    const feature = FEATURES[currentStep];
                    const Icon = feature.icon;
                    return (
                      <>
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          {feature.tag && (
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                              {feature.tag}
                            </span>
                          )}
                        </div>
                        <h3 className="mb-1 text-sm font-bold text-foreground">
                          {feature.headline}
                        </h3>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {feature.description}
                        </p>
                      </>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
