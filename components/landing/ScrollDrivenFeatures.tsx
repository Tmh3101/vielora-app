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
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  const modeRef = useRef<Mode>(SectionMode.NORMAL);
  const currentStepRef = useRef(0);
  const lastWheelTime = useRef(0);
  const lastUnlockTime = useRef(0);
  const lenis = useLenis();

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
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
  const maxStep = totalCards - 1;

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

      {/* ── mobile heading ── */}
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:hidden lg:px-8 lg:pt-32">
        <div className="mx-auto mb-8 max-w-3xl pt-20 text-center">
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

      {/* ── mobile vertical flow ── */}
      <div className="container relative z-10 mx-auto flex flex-col gap-12 px-4 sm:px-6 lg:hidden lg:px-8">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          const MockupComponent = MOCKUPS[index] || MockupAICustomize;

          return (
            <div key={index} className="w-full">
              <div className="mb-6">
                <div className="mx-auto max-w-md">
                  <MockupComponent />
                </div>
              </div>

              <div className="card-feature">
                <div className="relative mb-4 h-12 w-12">
                  <div className="bg-gradient-primary absolute inset-0 rounded-2xl opacity-20 blur-xl transition-opacity group-hover:opacity-40" />
                  <div className="glass-primary group-hover:shadow-glow-sm relative flex h-12 w-12 items-center justify-center rounded-2xl transition-shadow">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>

                {feature.tag && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="mb-3 inline-block rounded-md border-l-2 border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary"
                  >
                    {feature.tag}
                  </motion.span>
                )}

                <h3 className="mb-3 text-balance text-2xl font-semibold tracking-tight text-foreground">
                  {feature.headline}
                </h3>
                <p className="text-balance leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ScrollDrivenFeatures;
