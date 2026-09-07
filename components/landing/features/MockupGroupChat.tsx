"use client";

import { motion } from "framer-motion";
import { Users, Bot, CheckCircle2, Send, MessageSquarePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Mockup3DWrapper } from "./Mockup3DWrapper";

const MEMBERS = [
  { name: "Hải Nam", role: "PM", bg: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
  {
    name: "Thu Trang",
    role: "Sale",
    bg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  { name: "Minh Quân", role: "Dev", bg: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
];

export function MockupGroupChat() {
  const t = useTranslations("features.mockups.groupChat");

  return (
    <Mockup3DWrapper innerClassName="p-5 lg:min-w-[390px]">
      {/* Group Chat Header */}
      <div
        className="mb-3.5 flex items-center justify-between border-b border-border/40 pb-3"
        style={{ transform: "translateZ(10px)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-foreground">{t("groupTitle")}</span>
              <span className="py-0.2 rounded-full bg-primary/10 px-1.5 text-[8px] font-semibold text-primary">
                {t("aiEnabled")}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground">{t("memberCount")}</p>
          </div>
        </div>

        {/* Member Avatars */}
        <div className="flex -space-x-1.5 overflow-hidden">
          {MEMBERS.map((m) => (
            <div
              key={m.name}
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[9px] font-bold ${m.bg}`}
              title={m.name}
            >
              {m.name.charAt(0)}
            </div>
          ))}
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-[9px] font-bold text-white shadow-sm ring-2 ring-primary/30"
            title="Vielora AI Bot"
          >
            <Bot className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="space-y-2.5 py-1" style={{ transform: "translateZ(20px)" }}>
        {/* User Message */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-2"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[9px] font-bold text-blue-600 dark:text-blue-400">
            H
          </div>
          <div className="rounded-xl rounded-tl-sm border border-border/50 bg-muted/60 px-3 py-2 text-[10px] text-foreground">
            <span className="font-semibold text-primary">@Vielora Bot</span> {t("userMsg")}
          </div>
        </motion.div>

        {/* Bot AI Response Card */}
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex items-start gap-2"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm ring-2 ring-primary/20">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 rounded-xl rounded-tl-sm border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-background p-2.5 shadow-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-primary">{t("botName")}</span>
              <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5" /> {t("completed")}
              </span>
            </div>

            <div className="space-y-1 text-[9px] text-muted-foreground">
              <p>{t("sprintProgress")}</p>
              <p>{t("appointments")}</p>
            </div>

            {/* Reactions */}
            <div className="mt-2 flex items-center gap-1.5">
              <span className="shadow-xs rounded-full border border-border/60 bg-background/80 px-1.5 py-0.5 text-[8px] text-muted-foreground">
                👍 3
              </span>
              <span className="shadow-xs rounded-full border border-border/60 bg-background/80 px-1.5 py-0.5 text-[8px] text-muted-foreground">
                ❤️ 2
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Input Bar */}
      <div className="mt-3 flex items-center gap-2" style={{ transform: "translateZ(26px)" }}>
        <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-[10px] text-muted-foreground">
          <MessageSquarePlus className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span>{t("inputPlaceholder")}</span>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
          <Send className="h-3 w-3" />
        </div>
      </div>
    </Mockup3DWrapper>
  );
}
