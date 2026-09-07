"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Code2,
  Globe,
  Users,
  Bot,
  Send,
  X,
  MessageSquare,
  QrCode,
  Share2,
  Smartphone,
  Lock,
  Mic,
  Pin,
  SquarePen,
} from "lucide-react";
import { useTranslations } from "next-intl";

type AccessTab = "embed" | "standalone" | "group";

export default function AccessMethodsSection() {
  const t = useTranslations("accessMethods");
  const [activeTab, setActiveTab] = useState<AccessTab>("embed");
  const [isWidgetOpen, setIsWidgetOpen] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="demo" className="relative scroll-mt-24 overflow-hidden bg-card/50 py-16 lg:py-20">
      {/* Background ambient orbs */}
      <div className="orb orb-accent -left-40 top-1/4 h-80 w-80 opacity-25" />
      <div className="orb orb-primary -right-30 bottom-1/4 h-60 w-60 opacity-20" />
      <div className="dot-pattern pointer-events-none absolute inset-0 opacity-20" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header & Compact Tab Switcher */}
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="heading-premium mb-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl"
          >
            {t("heading")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="text-balance text-xs text-muted-foreground sm:text-sm"
          >
            {t("subheading")}
          </motion.p>

          {/* Compact Segmented Control */}
          <div className="mt-6 flex justify-center">
            <div className="shadow-xs inline-flex rounded-xl border border-border/60 bg-background/80 p-1 backdrop-blur-md">
              {[
                { id: "embed", label: t("tabs.embed"), icon: Code2 },
                { id: "standalone", label: t("tabs.standalone"), icon: Globe },
                { id: "group", label: t("tabs.group"), icon: Users },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as AccessTab)}
                    className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:px-4 sm:text-sm ${
                      isActive
                        ? "shadow-xs text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="compactTabPill"
                        className="absolute inset-0 rounded-lg bg-primary"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>{tab.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Showcase Views */}
        <div className="mx-auto max-w-5xl">
          <AnimatePresence mode="wait">
            {/* ================= TAB 1: WEBSITE EMBED ================= */}
            {activeTab === "embed" && (
              <motion.div
                key="embed-showcase"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="glass-lg relative overflow-hidden rounded-3xl border border-border/50 bg-background/95 p-4 shadow-2xl sm:p-5"
              >
                {/* Browser Frame Bar */}
                <div className="mb-3.5 flex items-center justify-between border-b border-border/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                    </div>
                    <div className="ml-2 flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/50 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      <Lock className="h-2.5 w-2.5 text-emerald-500" />
                      <span>https://your-website.com</span>
                    </div>
                  </div>
                </div>

                {/* Website Canvas Area */}
                <div className="relative min-h-[460px] rounded-2xl border border-border/40 bg-gradient-to-br from-background/90 to-muted/30 p-5 sm:min-h-[490px] sm:p-6">
                  {/* Website Mock Background Content (Darker & Richer Skeletons) */}
                  <div className="space-y-4 opacity-55">
                    {/* Header Nav Skeleton */}
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-foreground/20" />
                        <div className="h-4 w-24 rounded-md bg-foreground/20" />
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-3 w-12 rounded bg-foreground/15" />
                        <div className="h-3 w-14 rounded bg-foreground/15" />
                        <div className="h-6 w-16 rounded-md bg-foreground/20" />
                      </div>
                    </div>

                    {/* Hero Section Skeleton */}
                    <div className="space-y-2 pt-1">
                      <div className="h-7 w-2/3 rounded-lg bg-foreground/25 sm:w-1/2" />
                      <div className="h-3.5 w-4/5 rounded bg-foreground/15" />
                      <div className="flex gap-2 pt-1">
                        <div className="h-7 w-20 rounded-md bg-foreground/20" />
                        <div className="h-7 w-16 rounded-md bg-foreground/10" />
                      </div>
                    </div>

                    {/* Feature Cards Grid Skeleton */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="shadow-2xs rounded-xl border border-border/40 bg-card/60 p-3">
                        <div className="mb-2 h-16 rounded-lg bg-foreground/15" />
                        <div className="mb-1 h-3 w-3/4 rounded bg-foreground/20" />
                        <div className="h-2 w-1/2 rounded bg-foreground/10" />
                      </div>
                      <div className="shadow-2xs rounded-xl border border-border/40 bg-card/60 p-3">
                        <div className="mb-2 h-16 rounded-lg bg-foreground/15" />
                        <div className="mb-1 h-3 w-2/3 rounded bg-foreground/20" />
                        <div className="h-2 w-1/2 rounded bg-foreground/10" />
                      </div>
                      <div className="shadow-2xs rounded-xl border border-border/40 bg-card/60 p-3">
                        <div className="mb-2 h-16 rounded-lg bg-foreground/15" />
                        <div className="mb-1 h-3 w-4/5 rounded bg-foreground/20" />
                        <div className="h-2 w-1/2 rounded bg-foreground/10" />
                      </div>
                    </div>
                  </div>

                  {/* Real-style Vielora Chatbot Widget */}
                  <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2.5">
                    <AnimatePresence>
                      {isWidgetOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 12 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 12 }}
                          transition={{ duration: 0.25 }}
                          className="w-80 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl"
                        >
                          {/* Widget Header */}
                          <div className="flex items-center justify-between bg-primary p-3.5 text-primary-foreground">
                            <div className="flex items-center gap-2.5">
                              <div className="shadow-xs flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                                <Bot className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white">
                                  {t("mockups.embed.botName")}
                                </h4>
                                <p className="text-[10px] text-white/80">
                                  {t("mockups.embed.online247")}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setIsWidgetOpen(false)}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Message List */}
                          <div className="max-h-56 space-y-2.5 overflow-y-auto p-3 text-xs">
                            {/* Bot Welcome Message */}
                            <div className="flex justify-start">
                              <div className="rounded-tl-xs max-w-[85%] rounded-2xl bg-muted/70 p-2.5 text-foreground">
                                {t("mockups.embed.welcomeMsg")}
                              </div>
                            </div>

                            {/* User Question */}
                            <div className="flex justify-end">
                              <div className="rounded-tr-xs max-w-[85%] rounded-2xl bg-primary p-2.5 text-primary-foreground">
                                {t("mockups.embed.userMsg")}
                              </div>
                            </div>

                            {/* Bot Answer */}
                            <div className="flex justify-start">
                              <div className="rounded-tl-xs max-w-[85%] rounded-2xl bg-muted/70 p-2.5 text-foreground">
                                {t("mockups.embed.botAnswer")}
                              </div>
                            </div>
                          </div>

                          {/* Suggested Question Pills */}
                          <div className="flex gap-1.5 overflow-x-auto px-3 py-1.5 text-[10px]">
                            <span className="shrink-0 cursor-pointer rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                              {t("mockups.embed.suggestFeatures")}
                            </span>
                            <span className="shrink-0 cursor-pointer rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                              {t("mockups.embed.suggestSchedule")}
                            </span>
                          </div>

                          {/* Input Bar with Explicit Border */}
                          <div className="p-2.5">
                            <div className="shadow-2xs flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/90 px-2 py-1">
                              <input
                                disabled
                                placeholder={t("mockups.embed.inputPlaceholder")}
                                className="outline-hidden flex-1 bg-transparent px-1 text-xs text-foreground placeholder:text-muted-foreground"
                              />
                              <div className="shadow-2xs flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground">
                                <Mic className="h-3 w-3" />
                              </div>
                              <div className="shadow-xs flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                                <Send className="h-2.5 w-2.5" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Floating Launcher Button */}
                    <button
                      onClick={() => setIsWidgetOpen((p) => !p)}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
                      title={t("mockups.embed.launcherTooltip")}
                    >
                      {isWidgetOpen ? (
                        <X className="h-5 w-5" />
                      ) : (
                        <MessageSquare className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ================= TAB 2: STANDALONE PORTAL (DUAL SCREEN: WEB + MOBILE) ================= */}
            {activeTab === "standalone" && (
              <motion.div
                key="standalone-showcase"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid gap-6 lg:grid-cols-12 lg:items-stretch"
              >
                {/* 1. Màn hình Web Desktop (col-span-7) */}
                <div className="glass-lg flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-background/95 p-4 shadow-xl sm:p-5 lg:col-span-7">
                  <div>
                    {/* Top Browser Bar with Subdomain */}
                    <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                        </div>
                        <span className="rounded bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          https://tro-ly-ai.vielora.vn
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                        <Globe className="h-3 w-3" /> {t("mockups.standalone.webScreen")}
                      </span>
                    </div>

                    {/* StandaloneChatUI Full Layout */}
                    <div className="flex min-h-[460px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-slate-50/50 dark:bg-slate-950/50 sm:min-h-[490px]">
                      {/* Standalone Header in Primary Color */}
                      <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="shadow-xs flex h-9 w-9 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/10">
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold leading-tight text-white">
                              {t("mockups.standalone.botName")}
                            </h4>
                            <p className="text-[10px] text-white/80">
                              {t("mockups.standalone.onlineInstant")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25">
                            <QrCode className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25">
                            <Share2 className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* Standalone Chat Messages (max-w-3xl full stream) */}
                      <div className="flex-1 space-y-2.5 p-4 text-xs">
                        <div className="flex justify-start">
                          <div className="rounded-tl-xs shadow-xs max-w-[85%] rounded-2xl border border-border/40 bg-card p-3 text-foreground">
                            {t("mockups.standalone.webWelcome")}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="rounded-tr-xs shadow-xs max-w-[85%] rounded-2xl bg-primary p-3 text-primary-foreground">
                            {t("mockups.standalone.webUserMsg1")}
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="rounded-tl-xs shadow-xs max-w-[85%] rounded-2xl border border-border/40 bg-card p-3 text-foreground">
                            {t("mockups.standalone.webBotMsg1")}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="rounded-tr-xs shadow-xs max-w-[85%] rounded-2xl bg-primary p-3 text-primary-foreground">
                            {t("mockups.standalone.webUserMsg2")}
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="rounded-tl-xs shadow-xs max-w-[85%] rounded-2xl border border-border/40 bg-card p-3 text-foreground">
                            {t("mockups.standalone.webBotMsg2")}
                          </div>
                        </div>
                      </div>

                      {/* Suggested Questions */}
                      <div className="flex gap-2 overflow-x-auto border-t border-border/40 bg-background/80 px-4 py-2 text-[10px]">
                        <span className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
                          {t("mockups.standalone.suggestPricing")}
                        </span>
                        <span className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
                          {t("mockups.standalone.suggestDemo")}
                        </span>
                        <span className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
                          {t("mockups.standalone.suggestRefund")}
                        </span>
                      </div>

                      {/* Standalone Input Bar with Mic */}
                      <div className="flex items-center gap-2 border-t border-border/50 bg-card p-2.5">
                        <input
                          disabled
                          placeholder={t("mockups.standalone.inputPlaceholder")}
                          className="outline-hidden flex-1 rounded-xl border border-border/70 bg-background/80 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                        />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-muted dark:text-slate-300">
                          <Mic className="h-4 w-4" />
                        </div>
                        <div className="shadow-xs flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                          <Send className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Màn hình Mobile App (col-span-5) */}
                <div className="glass-lg flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-background/95 p-4 shadow-xl sm:p-5 lg:col-span-5">
                  <div className="flex-shrink-0">
                    <div className="mb-3 flex w-full items-center justify-between border-b border-border/50 pb-2.5">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                        <Smartphone className="h-3.5 w-3.5" />{" "}
                        {t("mockups.standalone.mobileScreen")}
                      </span>
                    </div>
                  </div>

                  {/* Extended Tall Phone Frame with Pinned Bottom Input */}
                  <div className="my-auto flex items-center justify-center py-1">
                    <div className="sm:w-68 relative flex h-[460px] min-h-[460px] w-64 flex-col justify-between rounded-[2.5rem] border-4 border-foreground/15 bg-background p-3 shadow-2xl">
                      {/* Top: Dynamic Island & Header */}
                      <div className="flex-shrink-0">
                        {/* Dynamic Island / Notch */}
                        <div className="mx-auto mb-2 h-3.5 w-20 rounded-full bg-foreground/20" />

                        {/* Standalone Mobile Header in Primary Color */}
                        <div className="shadow-xs mb-2 flex items-center justify-between rounded-xl bg-primary px-3 py-2 text-white">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/30 bg-white/10">
                              <Bot className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold leading-tight">
                                {t("mockups.standalone.botName")}
                              </p>
                              <p className="text-[7px] text-white/80">
                                {t("mockups.standalone.online247")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-white/90">
                            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15">
                              <QrCode className="h-3 w-3" />
                            </div>
                            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15">
                              <Share2 className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Chat Stream */}
                      <div className="flex-1 space-y-2 overflow-y-auto py-1 text-[10px]">
                        <div className="rounded-tl-xs shadow-2xs rounded-xl border border-border/40 bg-card p-2 leading-relaxed text-foreground/90">
                          {t("mockups.standalone.mobileWelcome")}
                        </div>
                        <div className="rounded-tr-xs shadow-2xs ml-auto max-w-[90%] rounded-xl bg-primary p-2 leading-relaxed text-white">
                          {t("mockups.standalone.mobileUserMsg1")}
                        </div>
                        <div className="rounded-tl-xs shadow-2xs rounded-xl border border-border/40 bg-card p-2 leading-relaxed text-foreground/90">
                          {t("mockups.standalone.mobileBotMsg1")}
                        </div>
                        <div className="rounded-tr-xs shadow-2xs ml-auto max-w-[85%] rounded-xl bg-primary p-2 leading-relaxed text-white">
                          {t("mockups.standalone.mobileUserMsg2")}
                        </div>
                      </div>

                      {/* Bottom: Suggested Questions & Input firmly pinned at the bottom */}
                      <div className="mt-auto flex-shrink-0 space-y-1.5 pt-1">
                        {/* Mobile Suggested Question Pills */}
                        <div className="flex gap-1 overflow-x-auto text-[9px]">
                          <span className="shrink-0 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                            {t("mockups.standalone.mobileSuggestPricing")}
                          </span>
                          <span className="shrink-0 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                            {t("mockups.standalone.mobileSuggestSchedule")}
                          </span>
                          <span className="shrink-0 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                            {t("mockups.standalone.mobileSuggestDocs")}
                          </span>
                        </div>

                        {/* Mobile Input with Mic & Send */}
                        <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2.5 py-1.5 text-[10px]">
                          <span className="flex-1 text-muted-foreground">
                            {t("mockups.standalone.mobileInputPlaceholder")}
                          </span>
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Mic className="h-3 w-3" />
                          </div>
                          <div className="shadow-xs flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <Send className="h-2.5 w-2.5" />
                          </div>
                        </div>

                        {/* Home Indicator Bar */}
                        <div className="mx-auto mt-1 h-1 w-20 rounded-full bg-foreground/20" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ================= TAB 3: GROUP CHAT (DUAL SCREEN: WEB + PWA APP) ================= */}
            {activeTab === "group" && (
              <motion.div
                key="group-showcase"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid gap-6 lg:grid-cols-12 lg:items-stretch"
              >
                {/* 1. Màn hình Web Group Workspace (col-span-7) */}
                <div className="glass-lg flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-background/95 p-4 shadow-xl sm:p-5 lg:col-span-7">
                  <div>
                    {/* Top Workspace Bar */}
                    <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                        </div>
                        <span className="rounded bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          https://tro-ly-ai.vielora.vn/group
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                        <Users className="h-3.5 w-3.5" /> {t("mockups.group.webScreen")}
                      </span>
                    </div>

                    {/* GroupChatView Real Layout */}
                    <div className="flex min-h-[460px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-slate-50/50 dark:bg-slate-950/50 sm:min-h-[490px]">
                      {/* Group Header in Primary Color */}
                      <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="shadow-xs flex h-9 w-9 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/10">
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold leading-tight text-white">
                                {t("mockups.group.groupTitle")}
                              </h4>
                            </div>
                            <p className="text-[10px] text-white/80">
                              {t("mockups.group.groupSubtitle")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25">
                            <SquarePen className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* Active Group Note Banner */}
                      <div className="flex items-center justify-between border-b border-primary/20 bg-primary/10 px-4 py-2 text-[11px] text-primary">
                        <div className="flex items-center gap-2 font-medium">
                          <Pin className="h-3.5 w-3.5 rotate-45" />
                          <span>{t("mockups.group.pinnedNote")}</span>
                        </div>
                        <span className="text-[10px] font-bold underline">
                          {t("mockups.group.viewDetail")}
                        </span>
                      </div>

                      {/* Group Chat Messages */}
                      <div className="flex-1 space-y-3 p-4 text-xs">
                        {/* Member Message 1 */}
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-600 dark:text-blue-400">
                            H
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground">
                                {t("mockups.group.user1Name")}
                              </span>
                              <span className="text-[9px] text-muted-foreground">10:15 AM</span>
                            </div>
                            <div className="rounded-tl-xs shadow-xs rounded-2xl border border-border/40 bg-card p-2.5 text-xs text-foreground">
                              {t("mockups.group.user1Msg")}
                            </div>
                          </div>
                        </div>

                        {/* Bot Group Response */}
                        <div className="flex items-start gap-2.5">
                          <div className="shadow-xs flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white">
                            <Bot className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-primary">
                                {t("mockups.group.botName")}
                              </span>
                              <span className="py-0.2 rounded bg-primary/10 px-1 text-[8px] font-semibold text-primary">
                                {t("mockups.group.aiAssistant")}
                              </span>
                            </div>
                            <div className="rounded-tl-xs shadow-xs rounded-2xl border border-border/40 bg-card p-2.5 text-xs text-foreground">
                              <p className="font-semibold">
                                {t("mockups.group.botResponseHeading")}
                              </p>
                              <p className="mt-0.5 text-muted-foreground">
                                {t("mockups.group.botResponsePoint1")}
                              </p>
                              <p className="text-muted-foreground">
                                {t("mockups.group.botResponsePoint2")}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Member Message 2 */}
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            T
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground">
                                {t("mockups.group.user2Name")}
                              </span>
                              <span className="text-[9px] text-muted-foreground">10:18 AM</span>
                            </div>
                            <div className="rounded-tl-xs shadow-xs rounded-2xl border border-border/40 bg-card p-2.5 text-xs text-foreground">
                              {t("mockups.group.user2Msg")}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Group Composer with Mic & Send */}
                      <div className="flex items-center gap-2 border-t border-border/50 bg-card p-2.5">
                        <input
                          disabled
                          placeholder={t("mockups.group.inputPlaceholder")}
                          className="outline-hidden flex-1 rounded-xl border border-border/70 bg-background/80 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                        />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-muted dark:text-slate-300">
                          <Mic className="h-4 w-4" />
                        </div>
                        <div className="shadow-xs flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                          <Send className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Màn hình Mobile App (col-span-5) */}
                <div className="glass-lg flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-background/95 p-4 shadow-xl sm:p-5 lg:col-span-5">
                  <div className="flex-shrink-0">
                    <div className="mb-3 flex w-full items-center justify-between border-b border-border/50 pb-2.5">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                        <Smartphone className="h-3.5 w-3.5" /> {t("mockups.group.mobileScreen")}
                      </span>
                    </div>
                  </div>

                  {/* Extended Tall Phone Frame with Pinned Bottom Input */}
                  <div className="my-auto flex items-center justify-center py-1">
                    <div className="sm:w-68 relative flex h-[460px] min-h-[460px] w-64 flex-col justify-between rounded-[2.5rem] border-4 border-foreground/15 bg-background p-3 shadow-2xl">
                      {/* Top: Dynamic Island & Header & Note Banner */}
                      <div className="flex-shrink-0">
                        {/* Dynamic Island */}
                        <div className="mx-auto mb-2 h-4 w-20 rounded-full bg-foreground/20" />

                        {/* Group Mobile Header in Primary Color */}
                        <div className="shadow-xs mb-1.5 flex items-center justify-between rounded-xl bg-primary px-3 py-2 text-white">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/30 bg-white/10">
                              <Bot className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold leading-tight">
                                {t("mockups.group.groupTitleShort")}
                              </p>
                              <p className="text-[7px] text-white/80">
                                {t("mockups.group.groupSubtitle")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-white/90">
                            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15">
                              <SquarePen className="h-3 w-3" />
                            </div>
                          </div>
                        </div>

                        {/* Mobile Active Note Banner */}
                        <div className="mb-1.5 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[8px] text-primary">
                          <div className="flex items-center gap-1 truncate font-medium">
                            <Pin className="h-2.5 w-2.5 shrink-0 rotate-45" />
                            <span className="truncate">{t("mockups.group.pinnedNoteShort")}</span>
                          </div>
                          <span className="ml-1 shrink-0 text-[7px] font-bold underline">
                            {t("mockups.group.view")}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Mobile Group Stream */}
                      <div className="flex-1 space-y-2 overflow-y-auto py-1 text-[10px]">
                        <div className="flex items-start gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[8px] font-bold text-blue-600 dark:text-blue-400">
                            H
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <p className="text-[8px] font-bold text-foreground">
                              {t("mockups.group.user1Name")}
                            </p>
                            <div className="rounded-tl-xs shadow-2xs rounded-xl border border-border/40 bg-card p-1.5 text-[9px] leading-relaxed text-foreground">
                              {t("mockups.group.user1MsgShort")}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5">
                          <div className="shadow-2xs flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <Bot className="h-3 w-3" />
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <p className="text-[8px] font-bold text-primary">
                              {t("mockups.group.botName")}
                            </p>
                            <div className="rounded-tl-xs shadow-2xs rounded-xl border border-border/40 bg-card p-1.5 text-[9px] leading-relaxed text-foreground">
                              {t("mockups.group.botResponseShort")}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[8px] font-bold text-emerald-600 dark:text-emerald-400">
                            T
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <p className="text-[8px] font-bold text-foreground">
                              {t("mockups.group.user2Name")}
                            </p>
                            <div className="rounded-tl-xs shadow-2xs rounded-xl border border-border/40 bg-card p-1.5 text-[9px] leading-relaxed text-foreground">
                              {t("mockups.group.user2MsgShort")}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom: Mobile Input with Mic & Send firmly pinned */}
                      <div className="mt-auto flex-shrink-0 pt-2">
                        <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2.5 py-1.5 text-[10px]">
                          <span className="flex-1 truncate text-muted-foreground">
                            {t("mockups.group.mobileInputPlaceholder")}
                          </span>
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Mic className="h-3 w-3" />
                          </div>
                          <div className="shadow-xs flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                            <Send className="h-2.5 w-2.5" />
                          </div>
                        </div>

                        {/* Home Indicator Bar */}
                        <div className="mx-auto mt-1.5 h-1 w-20 rounded-full bg-foreground/20" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
