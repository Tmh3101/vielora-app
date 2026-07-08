"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "lenis/react";
import {
  FEATURES,
  COOLDOWN_MS,
  TOUCHPAD_THRESHOLD,
  EXIT_GRACE_MS,
  SectionMode,
  type Mode,
} from "@/lib/constants";
import { MockupCrawl } from "./features/MockupCrawl";
import { MockupAICustomize } from "./features/MockupAICustomize";
import { MockupLeadForm } from "./features/MockupLeadForm";
import { MockupPWA } from "./features/MockupPWA";
import { MockupIntegration } from "./features/MockupIntegration";
import { MockupAnalytics } from "./features/MockupAnalytics";

const MOCKUPS: Record<number, React.ComponentType> = {
  0: MockupCrawl,
  1: MockupAICustomize,
  2: MockupIntegration,
  3: MockupPWA,
  4: MockupLeadForm,
  5: MockupAnalytics,
};

const ScrollDrivenFeatures = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>(SectionMode.NORMAL);
  const [currentStep, setCurrentStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const modeRef = useRef<Mode>(SectionMode.NORMAL);
  const currentStepRef = useRef(0);
  const lastWheelTime = useRef(0);
  const lastUnlockTime = useRef(0);
  const lenis = useLenis();

  const [mobileStep, setMobileStep] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInteractingRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setTimeout(() => setReducedMotion(mq.matches), 0);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setTimeout(() => setIsDesktop(mq.matches), 0);
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (!e.matches && modeRef.current !== SectionMode.NORMAL) {
        setMode(SectionMode.NORMAL);
        lenis?.start();
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [lenis]);

  const totalCards = FEATURES.length;

  useEffect(() => {
    if (isDesktop || reducedMotion) return;

    const startAutoPlay = () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      autoPlayRef.current = setInterval(() => {
        if (!isInteractingRef.current) {
          setMobileStep((prev) => (prev + 1) % totalCards);
        } else {
          isInteractingRef.current = false;
        }
      }, 5000);
    };

    startAutoPlay();
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, [isDesktop, reducedMotion, totalCards]);
  const maxStep = totalCards - 1;

  const resetInteractionTimer = useCallback(() => {
    isInteractingRef.current = true;
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, 8000);
  }, []);

  useEffect(() => {
    if (!isDesktop || reducedMotion) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (modeRef.current === SectionMode.LOCKED) return;
        if (entry.isIntersecting) {
          if (performance.now() - lastUnlockTime.current < EXIT_GRACE_MS) return;

          setMode(SectionMode.LOCKED);
          const target = window.scrollY + entry.boundingClientRect.top;
          requestAnimationFrame(() => {
            lenis?.stop();
            requestAnimationFrame(() => {
              lenis?.scrollTo(target, { immediate: true });
            });
          });
        } else if (modeRef.current === SectionMode.EXITING) {
          setMode(SectionMode.NORMAL);
        }
      },
      { threshold: [0.98] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isDesktop, reducedMotion, lenis]);

  useEffect(() => {
    if (!isDesktop || reducedMotion) return;
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (modeRef.current !== SectionMode.LOCKED) return;
      if (Math.abs(e.deltaY) < TOUCHPAD_THRESHOLD) return;

      const now = Date.now();
      if (now - lastWheelTime.current < COOLDOWN_MS) return;

      const step = currentStepRef.current;
      if (e.deltaY > 0) {
        if (step < maxStep) {
          e.preventDefault();
          lastWheelTime.current = now;
          setCurrentStep((p) => p + 1);
          return;
        }

        lastWheelTime.current = now;
        lastUnlockTime.current = performance.now();
        setMode(SectionMode.EXITING);
        lenis?.start();
        return;
      }

      if (e.deltaY < 0) {
        if (step > 0) {
          e.preventDefault();
          lastWheelTime.current = now;
          setCurrentStep((p) => p - 1);
          return;
        }

        lastWheelTime.current = now;
        lastUnlockTime.current = performance.now();
        setMode(SectionMode.EXITING);
        lenis?.start();
        return;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [isDesktop, reducedMotion, lenis, maxStep]);

  useEffect(() => {
    if (mode !== SectionMode.LOCKED || !containerRef.current || !lenis) return;
    const onResize = () => {
      if (modeRef.current !== SectionMode.LOCKED || !containerRef.current || !lenis) return;
      const rect = containerRef.current.getBoundingClientRect();
      const target = window.scrollY + rect.top;
      lenis.scrollTo(target, { immediate: true });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mode, lenis]);

  const ActiveMockup = MOCKUPS[currentStep] || MOCKUPS[0];

  const jumpToStep = useCallback((i: number) => {
    if (modeRef.current === SectionMode.LOCKED) {
      setCurrentStep(i);
    }
  }, []);

  if (reducedMotion) {
    return (
      <section id="features" className="relative scroll-mt-32 overflow-x-clip py-20 lg:pt-32">
        <div className="bg-grain pointer-events-none absolute inset-0 opacity-[0.12]" />
        <div className="dot-pattern absolute inset-0 opacity-30" />
        <div className="orb orb-primary -right-32 -top-32 h-64 w-64 opacity-50" />
        <div className="orb orb-primary -bottom-24 -left-24 h-48 w-48 opacity-40" />

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="heading-premium mb-6 text-4xl font-bold tracking-tighter text-foreground sm:text-5xl">
              Giải pháp <span className="text-gradient-animated text-balance">chatbot</span> toàn
              diện
            </h2>
            <p className="text-lg text-muted-foreground">
              Từ việc xây dựng kho kiến thức cho AI đến theo dõi hiệu suất, tất cả đều có sẵn
            </p>
          </div>

          <div className="flex flex-col gap-16">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              const MockupComponent = MOCKUPS[index] || MockupAICustomize;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5 }}
                  className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16"
                >
                  <div>
                    <MockupComponent />
                  </div>
                  <div className="card-feature">
                    <div className="relative mb-4 h-12 w-12">
                      <div className="bg-gradient-primary absolute inset-0 rounded-2xl opacity-20 blur-xl" />
                      <div className="glass-primary relative flex h-12 w-12 items-center justify-center rounded-2xl">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>

                    {feature.tag && (
                      <span className="mb-3 inline-block rounded-md border-l-2 border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
                        {feature.tag}
                      </span>
                    )}

                    <h3 className="mb-3 text-balance text-2xl font-semibold tracking-tight text-foreground">
                      {feature.headline}
                    </h3>
                    <p className="text-balance leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="features"
      ref={containerRef}
      className="relative h-screen overflow-hidden bg-card/50"
    >
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-[0.12]" />
      <div className="dot-pattern absolute inset-0 opacity-30" />
      <div className="orb orb-primary -right-32 -top-32 h-64 w-64" />
      <div className="orb orb-primary -bottom-24 -left-24 h-48 w-48" />

      {/* ── desktop sticky viewport ── */}
      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:w-full lg:overflow-hidden">
        <div className="container relative z-10 mx-auto flex h-full flex-col px-4 sm:px-6 lg:px-8 lg:pt-16">
          <div className="flex-shrink-0 pt-8 text-center lg:pb-2">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="heading-premium mb-4 text-3xl font-bold text-foreground sm:text-4xl"
            >
              Giải pháp <span className="text-gradient-animated text-balance">chatbot</span> toàn
              diện
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-muted-foreground"
            >
              Từ việc xây dựng kho kiến thức cho AI đến theo dõi hiệu suất, tất cả đều có sẵn
            </motion.p>
          </div>

          <div className="mt-[-60px] flex flex-1 flex-col px-16 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
            <div className="hidden lg:flex lg:h-full lg:items-center lg:justify-center">
              <div
                className="relative h-[30rem] w-full max-w-xl overflow-visible"
                style={{ perspective: 1200 }}
              >
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentStep}
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{
                      opacity: 0,
                      scale: 0.92,
                      y: 24,
                      rotateY: 8,
                      rotateX: 4,
                      filter: "blur(6px)",
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      rotateY: 0,
                      rotateX: 0,
                      filter: "blur(0px)",
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.9,
                      y: -24,
                      rotateY: -8,
                      rotateX: -4,
                      filter: "blur(6px)",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 120,
                      damping: 20,
                      mass: 0.8,
                    }}
                  >
                    <ActiveMockup />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="hidden flex-col items-center lg:flex">
              <div className="relative flex h-full w-full flex-col items-center justify-center py-6">
                <div className="relative flex flex-col items-center gap-9">
                  <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 rounded-full bg-border/20" />

                  <motion.span
                    className="absolute left-1/2 top-0 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-primary via-primary/80 to-primary/40"
                    animate={{
                      height: `${(currentStep / (FEATURES.length - 1)) * 100}%`,
                    }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                  {FEATURES.map((_, i) => {
                    const isActive = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <button
                        key={i}
                        onClick={() => jumpToStep(i)}
                        className={`relative z-10 flex h-4 w-4 items-center justify-center rounded-full border transition-all duration-300 hover:scale-125 active:scale-95 ${
                          isActive
                            ? "border-primary bg-primary ring-4 ring-primary/20"
                            : "border-primary/30 bg-transparent"
                        }`}
                      >
                        {isCurrent && (
                          <motion.span
                            className="absolute inset-0 rounded-full bg-primary/30"
                            animate={{ scale: [1, 1.35], opacity: [0.3, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="hidden lg:relative lg:block lg:h-full">
              <div className="relative h-full w-full">
                {FEATURES.map((feature, index) => {
                  const Icon = feature.icon;
                  const isPast = index < currentStep;
                  const isCurrent = index === currentStep;
                  const isFuture = index > currentStep;

                  if (isFuture) return null;

                  return (
                    <motion.div
                      key={index}
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0, y: 250 }}
                      animate={
                        isPast
                          ? {
                              opacity: 0.6,
                              y: -40 - (currentStep - index - 1) * 6,
                              scale: 0.96,
                              filter: "blur(1.5px)",
                            }
                          : {
                              opacity: 1,
                              y: 0,
                              scale: 1,
                              filter: "blur(0px)",
                            }
                      }
                      transition={{
                        duration: 0.8,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{ zIndex: isCurrent ? 20 : 1 }}
                    >
                      <div className="card-feature w-full max-w-lg">
                        <div className="relative mb-2 h-8 w-8">
                          <div className="bg-gradient-primary absolute inset-0 rounded-xl opacity-20 blur-xl transition-opacity group-hover:opacity-40" />
                          <div className="glass-primary group-hover:shadow-glow-sm relative flex h-8 w-8 items-center justify-center rounded-xl transition-shadow">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                        </div>

                        {feature.tag && (
                          <span className="mb-3 inline-block rounded-md border-l-2 border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
                            {feature.tag}
                          </span>
                        )}

                        <h3 className="mb-2 text-balance text-xl font-extrabold tracking-tight text-foreground">
                          {feature.headline}
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── mobile/tablet carousel ── */}
      <div className="absolute inset-0 z-10 flex flex-col lg:hidden">
        {/* heading */}
        <div className="flex-shrink-0 px-4 pt-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="heading-premium mb-4 text-3xl font-bold text-foreground sm:text-4xl"
            >
              Giải pháp <span className="text-gradient-animated">chatbot</span> toàn diện
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-muted-foreground"
            >
              Từ việc xây dựng kho kiến thức cho AI đến theo dõi hiệu suất, tất cả đều có sẵn
            </motion.p>
          </div>
        </div>

        {/* horizontal progress bar */}
        <div className="flex-shrink-0 px-4 pt-6 sm:px-6">
          <div className="mx-auto max-w-sm">
            <div className="relative flex items-center justify-between">
              <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-border/20" />
              <motion.span
                className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary/40"
                animate={{ width: `${(mobileStep / maxStep) * 100}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    resetInteractionTimer();
                    setMobileStep(i);
                  }}
                  className="relative z-10 flex h-8 w-8 items-center justify-center"
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                      i === mobileStep
                        ? "scale-125 bg-primary ring-4 ring-primary/20"
                        : i < mobileStep
                          ? "bg-primary/60"
                          : "bg-border/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* mockup */}
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 pt-20 md:pt-0">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                {(() => {
                  const M = MOCKUPS[mobileStep] || MockupAICustomize;
                  return <M />;
                })()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* feature card */}
        <div className="flex-shrink-0 px-4 pb-6 pt-20 sm:pb-8 md:pt-0">
          <div className="mx-auto max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileStep}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                {(() => {
                  const feature = FEATURES[mobileStep];
                  const Icon = feature.icon;
                  return (
                    <div className="card-feature">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="relative h-10 w-10 flex-shrink-0">
                          <div className="bg-gradient-primary absolute inset-0 rounded-xl opacity-20 blur-xl" />
                          <div className="glass-primary relative flex h-10 w-10 items-center justify-center rounded-xl">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        {feature.tag && (
                          <span className="rounded-md border-l-2 border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-primary">
                            {feature.tag}
                          </span>
                        )}
                      </div>
                      <h3 className="mb-2 text-balance text-lg font-semibold tracking-tight text-foreground">
                        {feature.headline}
                      </h3>
                      <p className="text-balance text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScrollDrivenFeatures;
