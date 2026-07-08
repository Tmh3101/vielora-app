"use client";

import { motion } from "framer-motion";
import { Coins, MessageCircle, MessagesSquare, UserPlus } from "lucide-react";
import { Mockup3DWrapper } from "./Mockup3DWrapper";

function buildPath(data: number[], w: number, h: number) {
  const step = w / (data.length - 1);
  return data.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (v / 100) * h}`).join(" ");
}

const MESSAGES = [65, 78, 52, 91, 84, 70, 98];
const CONVERSATIONS = [18, 24, 15, 32, 28, 22, 35];
const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const CHART_W = 240;
const CHART_H = 100;

export function MockupAnalytics() {
  const metrics = [
    {
      label: "Cuộc hội thoại",
      value: "12,847",
      change: "+23.5%",
      positive: true,
      icon: MessagesSquare,
    },
    {
      label: "Tin nhắn người dùng",
      value: "89,472",
      change: "+12.1%",
      positive: true,
      icon: MessageCircle,
    },
    { label: "Liên hệ", value: "847", change: "+5.2%", positive: true, icon: UserPlus },
    { label: "Credits đã dùng", value: "2,480", change: "-3.1%", positive: false, icon: Coins },
  ];

  return (
    <Mockup3DWrapper>
      <p
        className="mb-3 text-xs font-medium text-muted-foreground"
        style={{ transform: "translateZ(8px)" }}
      >
        Dashboard Hiệu suất
      </p>

      <div className="mb-4 grid grid-cols-4 gap-2" style={{ transform: "translateZ(14px)" }}>
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-lg border border-border/50 bg-background/50 p-2.5"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[9px] text-muted-foreground">{m.label}</p>
                <div className="rounded-md bg-primary/10 p-1 text-primary">
                  <Icon className="h-3 w-3" />
                </div>
              </div>
              <p className="text-sm font-bold tabular-nums text-foreground">{m.value}</p>
              <p
                className={`mt-0.5 text-[9px] font-medium ${
                  m.positive ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {m.change}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div
        className="rounded-lg border border-border/50 bg-background/50 p-3"
        style={{ transform: "translateZ(18px)" }}
      >
        <p className="mb-2 text-[10px] font-medium text-foreground">Biểu đồ tương tác</p>

        <div className="flex items-start gap-3">
          <div
            className="flex flex-col justify-between text-[8px] leading-none text-muted-foreground"
            style={{ height: CHART_H }}
          >
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>
          <div className="flex-1">
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              className="w-full"
              style={{ height: CHART_H }}
            >
              <line
                x1="0"
                y1="0"
                x2={CHART_W}
                y2="0"
                stroke="hsl(var(--border))"
                strokeDasharray="2 2"
                strokeWidth="0.5"
              />
              <line
                x1="0"
                y1={CHART_H * 0.5}
                x2={CHART_W}
                y2={CHART_H * 0.5}
                stroke="hsl(var(--border))"
                strokeDasharray="2 2"
                strokeWidth="0.5"
              />
              <line
                x1="0"
                y1={CHART_H}
                x2={CHART_W}
                y2={CHART_H}
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
              />

              <motion.path
                d={buildPath(CONVERSATIONS, CHART_W, CHART_H)}
                fill="none"
                stroke="#14b8a6"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              />

              <motion.path
                d={buildPath(MESSAGES, CHART_W, CHART_H)}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              />
            </svg>
          </div>
        </div>

        <div className="mt-1 flex justify-between px-7 text-[8px] text-muted-foreground">
          {DAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-4 text-[8px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-3 rounded bg-[hsl(var(--primary))]" />
            <span>Tin nhắn</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-0 w-3 border-b border-dashed border-[#14b8a6] pb-[1px]" />
            <span>Hội thoại</span>
          </div>
        </div>
      </div>
    </Mockup3DWrapper>
  );
}
