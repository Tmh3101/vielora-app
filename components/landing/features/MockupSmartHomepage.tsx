"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Compass, Zap, Check, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Mockup3DWrapper } from "./Mockup3DWrapper";

export function MockupSmartHomepage() {
  const t = useTranslations("features.mockups.smartHomepage");

  // 0: User asking on homepage
  // 1: Bot responding + Countdown banner showing
  // 2: Page navigated to /pricing + widget reopened with continuity
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 3);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  return (
    <Mockup3DWrapper innerClassName="p-4 lg:min-w-[400px]">
      {/* Browser Top Window Bar */}
      <div
        className="mb-3 flex items-center justify-between border-b border-border/40 pb-2.5"
        style={{ transform: "translateZ(10px)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500/80" />
          <span className="h-2 w-2 rounded-full bg-yellow-500/80" />
          <span className="h-2 w-2 rounded-full bg-green-500/80" />
          <div className="ml-2 flex items-center gap-1.5 rounded-md border border-border/50 bg-background/80 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5 text-emerald-500" />
            <span>https://yourbrand.vn</span>
            <AnimatePresence mode="wait">
              {step >= 2 ? (
                <motion.span
                  key="pricing-url"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="font-bold text-primary"
                >
                  /pricing
                </motion.span>
              ) : (
                <motion.span
                  key="home-url"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  /home
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
          <Compass className="h-3 w-3" />
          <span>{t("intentNav")}</span>
        </div>
      </div>

      {/* Website Page Canvas */}
      <div
        className="relative min-h-[220px] overflow-hidden rounded-xl border border-border/40 bg-background/60 p-3 shadow-inner"
        style={{ transform: "translateZ(14px)" }}
      >
        {/* Background Website Content that changes upon navigation */}
        <AnimatePresence mode="wait">
          {step < 2 ? (
            <motion.div
              key="homepage-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2 opacity-50"
            >
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-2.5 w-2/3 rounded bg-muted/80" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="h-16 rounded-lg bg-muted/60" />
                <div className="h-16 rounded-lg bg-muted/60" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="pricing-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-foreground">{t("pricingTitle")}</span>
                  <p className="text-[8px] text-muted-foreground">{t("pricingSub")}</p>
                </div>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {t("targetReached")}
                </span>
              </div>

              {/* Pricing Cards Mock */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-lg border border-border/60 bg-card p-2">
                  <span className="text-[9px] font-bold text-foreground">{t("standardPlan")}</span>
                  <div className="my-1 text-[11px] font-extrabold text-primary">
                    {t("standardPrice")}
                  </div>
                  <div className="space-y-0.5 text-[7px] text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <Check className="h-2 w-2 text-emerald-500" /> {t("standardFeat1")}
                    </p>
                    <p className="flex items-center gap-1">
                      <Check className="h-2 w-2 text-emerald-500" /> {t("standardFeat2")}
                    </p>
                  </div>
                </div>

                <div className="shadow-xs rounded-lg border border-primary/40 bg-primary/5 p-2">
                  <span className="text-[9px] font-bold text-primary">{t("proPlan")}</span>
                  <div className="my-1 text-[11px] font-extrabold text-primary">
                    {t("proPrice")}
                  </div>
                  <div className="space-y-0.5 text-[7px] text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <Check className="h-2 w-2 text-emerald-500" /> {t("proFeat1")}
                    </p>
                    <p className="flex items-center gap-1">
                      <Check className="h-2 w-2 text-emerald-500" /> {t("proFeat2")}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Chat Widget Box */}
        <div className="absolute bottom-2 right-2 z-20 w-64">
          <div
            className="overflow-hidden rounded-xl border border-primary/30 bg-card/95 shadow-xl backdrop-blur-md"
            style={{ transform: "translateZ(26px)" }}
          >
            {/* Widget Mini Header */}
            <div className="flex items-center justify-between bg-primary px-2.5 py-1.5 text-white">
              <div className="flex items-center gap-1.5">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                  <Bot className="h-2.5 w-2.5" />
                </div>
                <span className="text-[9px] font-bold">{t("assistantName")}</span>
              </div>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            </div>

            {/* Conversation Flow */}
            <div className="space-y-1.5 p-2 text-[9px]">
              {/* User Question */}
              <div className="flex justify-end">
                <div className="rounded-tr-xs rounded-lg bg-primary px-2 py-1 text-white">
                  {t("userQuestion")}
                </div>
              </div>

              {/* Bot Response */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="rounded-tl-xs rounded-lg bg-muted/80 px-2 py-1 text-foreground/90">
                  {step >= 2 ? <span>{t("botLanded")}</span> : <span>{t("botRedirecting")}</span>}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Real Smart Homepage Navigation Countdown Banner */}
        <AnimatePresence>
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 10, x: "-50%" }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute bottom-4 left-1/2 z-30 flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] text-white shadow-xl ring-1 ring-white/10"
              style={{ transform: "translateX(-50%) translateZ(36px)" }}
            >
              <Zap className="h-3 w-3 animate-bounce text-amber-400" />
              <span>
                {t("redirectingTo")} <b>/pricing</b> (2s)
              </span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[8px] font-medium text-slate-300">
                {t("cancel")}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Feature Description Bar at bottom */}
      <div
        className="mt-3 flex items-center justify-between text-[9px] text-muted-foreground"
        style={{ transform: "translateZ(10px)" }}
      >
        <span className="flex items-center gap-1">
          <Check className="h-3 w-3 text-emerald-500" /> {t("intentRecognized")}
        </span>
        <span className="flex items-center gap-1">
          <Check className="h-3 w-3 text-emerald-500" /> {t("seamlessChat")}
        </span>
      </div>
    </Mockup3DWrapper>
  );
}
