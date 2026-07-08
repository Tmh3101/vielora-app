"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  HeartHandshake,
  Zap,
  MessageCircle,
  HeadphonesIcon,
  PenLine,
  Plus,
  Palette,
  Bot,
  Heart,
  MapPin,
  Send,
  X,
} from "lucide-react";
import { Mockup3DWrapper } from "./Mockup3DWrapper";

const personalities = [
  { name: "Chuyên nghiệp", icon: Briefcase, active: true },
  { name: "Thân thiện", icon: HeartHandshake, active: false },
  { name: "Năng động", icon: Zap, active: false },
];

const colorMap: Record<
  string,
  { bg: string; border: string; text: string; dot: string; ring: string }
> = {
  "Chuyên nghiệp": {
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    ring: "ring-blue-500/25",
  },
  "Thân thiện": {
    bg: "bg-rose-500/10",
    border: "border-rose-500/25",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    ring: "ring-rose-500/25",
  },
  "Năng động": {
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    ring: "ring-amber-500/25",
  },
};

const skills = [
  { name: "Tư vấn bán hàng", icon: MessageCircle },
  { name: "Chăm sóc KH", icon: HeadphonesIcon },
  { name: "Viết nội dung", icon: PenLine },
];

const PRIMARY = "#6366F1";

export function MockupAICustomize() {
  return (
    <div className="pt-36">
      <Mockup3DWrapper overflowVisible>
        <div className="relative">
          <div className="mb-3 flex items-center gap-2" style={{ transform: "translateZ(8px)" }}>
            <span className="flex h-2 w-2 rounded-full bg-green-500" />
            <span className="text-[13px] font-extrabold uppercase text-foreground">Tính cách</span>
          </div>

          <div style={{ transform: "translateZ(6px)" }}>
            <p className="mb-2 text-[11px] text-muted-foreground">Tính cách AI</p>
            <div className="mb-3 flex flex-wrap gap-0.5" style={{ transform: "translateZ(10px)" }}>
              {personalities.map((p, i) => {
                const c = colorMap[p.name];
                const Icon = p.icon;
                return (
                  <motion.div
                    key={p.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: i * 0.1,
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`relative flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-shadow ${c.bg} ${c.border} ${c.text} ${
                      p.active ? "shadow-sm" : "opacity-80"
                    }`}
                  >
                    {p.active && (
                      <span className={`absolute -inset-[2px] rounded-full ring-1 ${c.ring}`} />
                    )}
                    <Icon className="h-2.5 w-2.5" />
                    {p.name}
                    {p.active && (
                      <span className={`ml-0.5 flex h-1.5 w-1.5 rounded-full ${c.dot}`} />
                    )}
                  </motion.div>
                );
              })}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-1 rounded-full border border-dashed border-border/30 bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
              >
                <Plus className="h-2.5 w-2.5" />9
              </motion.div>
            </div>

            <div>
              <p
                className="mb-2 text-[11px] text-muted-foreground"
                style={{ transform: "translateZ(6px)" }}
              >
                Kỹ năng đã kích hoạt
              </p>
              <div className="grid grid-cols-2 gap-1" style={{ transform: "translateZ(14px)" }}>
                {skills.slice(0, 2).map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.div
                      key={s.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.2 + i * 0.08,
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.04] px-2 py-1.5 text-[10px] font-medium text-primary"
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{s.name}</span>
                    </motion.div>
                  );
                })}
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                className="mt-1.5 flex items-center gap-1 text-[9px] font-medium text-muted-foreground/50"
              >
                <Plus className="h-2 w-2" />
                Thêm kỹ năng
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.5,
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
            className="absolute -right-16 -top-56 w-[72%] rounded-2xl border border-border/10 bg-card p-3 shadow-xl"
            style={{ z: 24 }}
          >
            <div className="mb-2 flex items-center gap-2" style={{ transform: "translateZ(8px)" }}>
              <span className="flex h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[13px] font-extrabold uppercase text-foreground">
                Giao diện widget
              </span>
            </div>

            <div
              className="overflow-hidden rounded-xl border border-border/20 bg-background shadow-sm"
              style={{ transform: "translateZ(8px)" }}
            >
              <div className="flex items-center justify-between bg-primary px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-lg border border-white/30 bg-white/20">
                    <Bot className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[9px] font-semibold text-white">Trợ lý AI của bạn</p>
                    <p className="text-[7px] text-white/70">Trực tuyến</p>
                  </div>
                </div>
                <X className="h-2.5 w-2.5 text-white/60" />
              </div>

              <div className="space-y-1.5 px-3 py-2">
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="w-fit max-w-[80%] rounded-xl rounded-bl-sm bg-muted px-2 py-1.5 text-[8px] leading-relaxed text-foreground/80"
                  style={{ transform: "translateZ(2px)" }}
                >
                  👋 Chào bạn! Tôi có thể giúp gì cho bạn?
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="ml-auto w-fit max-w-[80%] rounded-xl rounded-br-sm bg-primary px-2 py-1.5 text-[8px] leading-relaxed text-white"
                  style={{ transform: "translateZ(4px)" }}
                >
                  Tôi cần hỗ trợ
                </motion.div>

                <div className="flex items-start gap-2" style={{ transform: "translateZ(6px)" }}>
                  <div className="flex items-center gap-[2px] rounded-lg bg-muted/60 px-2 py-1.5">
                    <span className="h-1 w-1 animate-bounce rounded-full bg-primary/60" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-primary/60 [animation-delay:0.15s]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-primary/60 [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 border-t border-border/20 px-3 py-1.5">
                <div className="flex-1 rounded-md border border-border/30 bg-background/60 px-2 py-1 text-[7px] text-muted-foreground/50">
                  Nhập tin nhắn...
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Send className="h-2 w-2 text-white" />
                </div>
              </div>
            </div>

            <div
              className="mt-2 flex items-center justify-between"
              style={{ transform: "translateZ(12px)" }}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex h-3.5 w-3.5 items-center justify-center rounded border border-border/20 bg-primary">
                  <Palette className="h-2 w-2 text-white" />
                </div>
                <span className="font-mono text-[8px] text-muted-foreground/60">{PRIMARY}</span>
                <div className="ml-1 flex items-center gap-0.5">
                  {[MessageCircle, Bot, Heart].map((Icon, i) => (
                    <div
                      key={i}
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                        i === 0
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/40 bg-background text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-2 w-2" />
                    </div>
                  ))}
                  <span className="px-0.5 text-[7px] font-medium text-muted-foreground/50">+2</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[7px] font-medium text-muted-foreground/50">
                <MapPin className="h-2 w-2" />
                Vị trí
              </div>
            </div>
          </motion.div>
        </div>
      </Mockup3DWrapper>
    </div>
  );
}
