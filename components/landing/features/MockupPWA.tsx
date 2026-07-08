"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";
import { PhoneFrame } from "./pwa/PhoneFrame";
import { TouchIndicator } from "./pwa/TouchIndicator";
import { BackgroundEffects } from "./pwa/BackgroundEffects";

const SCENE_DURATIONS = [2500, 2000, 2000, 1200, 5000] as const;
const TOTAL_SCENES = 5;

function useSceneLoop(): number {
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setScene((prev) => (prev + 1) % TOTAL_SCENES);
    }, SCENE_DURATIONS[scene]);
    return () => clearTimeout(timer);
  }, [scene]);

  return scene;
}

function usePhase(...timings: number[]): number {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = timings.map((ms, i) => setTimeout(() => setPhase(i + 1), ms));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return phase;
}

function SceneWrapper({
  show,
  duration = 0.6,
  children,
}: {
  show: boolean;
  duration?: number;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WebsiteContent({
  dimmed,
  tapPhase,
}: {
  dimmed: boolean;
  tapPhase?: "idle" | "tap" | "hidden";
}) {
  return (
    <motion.div
      className="relative flex h-full flex-col px-2 pt-5"
      animate={{ opacity: dimmed ? 0.25 : 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {tapPhase && (
        <div className="absolute inset-0 z-50">
          <TouchIndicator x={82} y={7} phase={tapPhase} delay={0} />
        </div>
      )}
      <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
        <svg
          className="h-2.5 w-2.5 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span className="flex-1 text-[6px] text-gray-500">vielora.ai</span>
        <div className="flex -space-x-1">
          <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
        </div>
      </div>

      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Bot className="h-3 w-3 text-white" />
            </div>
            <div>
              <p className="text-[7px] font-medium text-gray-700">Trợ lý AI của bạn</p>
              <p className="text-[6px] text-gray-400">Đang hoạt động</p>
            </div>
          </div>
        </div>
        <motion.button
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-primary"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
            />
          </svg>
        </motion.button>
      </div>

      <div className="flex-1 px-1">
        <motion.div
          className="flex justify-start"
          initial={{ opacity: 0, y: 10, x: -6 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 text-[7px] leading-relaxed text-gray-800">
            Xin chào 👋 Tôi có thể giúp gì cho bạn?
          </div>
        </motion.div>
      </div>

      <div className="mt-auto flex items-center gap-1.5 border-t border-gray-200 p-3">
        <div className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-[7px] text-gray-400">
          Nhập tin nhắn...
        </div>
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent">
          <svg
            className="h-2.5 w-2.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

function InstallContent() {
  const phase = usePhase(400, 600, 800);

  return (
    <>
      <motion.div
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-gray-200 bg-white/95 px-3 pb-4 pt-5 backdrop-blur-xl"
        initial={{ y: "100%" }}
        animate={{ y: phase >= 1 && phase < 4 ? "0%" : "100%" }}
        transition={{ type: "spring", stiffness: 250, damping: 28, mass: 0.8 }}
      >
        <div className="mb-2.5 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Bot className="h-3 w-3 text-white" />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-gray-900">Trợ lý AI của bạn</p>
            <p className="text-[6.5px] text-gray-500">Cài đặt ứng dụng độc lập</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-gray-200 py-1.5 text-center text-[8px] font-medium text-gray-500">
            Hủy
          </div>
          <motion.div
            className="flex-1 rounded-lg bg-gradient-to-r from-primary to-accent py-1.5 text-center text-[8px] font-semibold text-white shadow-md"
            animate={phase >= 2 ? { scale: [1, 0.92, 1] } : {}}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            Cài đặt
          </motion.div>
        </div>
      </motion.div>

      {phase >= 1 && phase < 4 && (
        <div className="absolute inset-0 z-50">
          <TouchIndicator x={70} y={83} phase={phase >= 2 ? "tap" : "idle"} delay={0} />
        </div>
      )}
    </>
  );
}

function HomeContent() {
  const phase = usePhase(500, 700);

  const apps = [
    { name: "Điện thoại", color: "bg-emerald-500", icon: "📞" },
    { name: "SMS", color: "bg-yellow-500", icon: "💬" },
    { name: "Mail", color: "bg-blue-500", icon: "✉️" },
    { name: "Cài đặt", color: "bg-zinc-500", icon: "⚙️" },
    { name: "Trợ lý AI", color: "bg-gradient-to-br from-primary to-accent", icon: "bot" },
  ];

  return (
    <div className="px-4 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[8px] font-semibold text-gray-700">Thứ Hai, 10</span>
        <div className="flex gap-1">
          <div className="h-1 w-3 rounded-full bg-gray-300" />
          <div className="h-1 w-2 rounded-full bg-gray-200" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-5">
        {apps.map((app, i) => (
          <motion.div
            key={app.name}
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
          >
            <motion.div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${app.color} shadow-sm`}
              animate={
                app.name === "Trợ lý AI" && phase >= 2
                  ? { scale: [1, 1.18, 0.92, 1.06, 1] }
                  : app.name === "Trợ lý AI"
                    ? { scale: [1, 1.05, 1] }
                    : {}
              }
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {app.icon === "bot" ? (
                <Bot className="h-4 w-4 text-white" />
              ) : (
                <span className="text-sm">{app.icon}</span>
              )}
            </motion.div>
            <span className="text-[6px] text-gray-500">{app.name}</span>
          </motion.div>
        ))}
      </div>

      {phase >= 1 && phase < 3 && (
        <div className="absolute inset-0 z-50">
          <TouchIndicator x={50} y={35} phase={phase >= 2 ? "tap" : "idle"} delay={0} />
        </div>
      )}
    </div>
  );
}

function LaunchContent() {
  const phase = usePhase(200);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-primary/90 to-accent/90 pt-5">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
        <Bot className="h-5 w-5 text-white" />
      </div>
      <p className="mb-4 text-[11px] font-bold text-white">Trợ lý AI của bạn</p>

      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/70"
            animate={{
              opacity: phase >= 1 ? [0.3, 1, 0.3] : 0.3,
              scale: phase >= 1 ? [0.8, 1.2, 0.8] : 0.8,
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const CHAT_MESSAGES = [
  { role: "ai", text: "Xin chào 👋 Tôi có thể giúp gì cho bạn?", delay: 200 },
  { role: "user", text: "Tư vấn giúp tôi gói Standard", delay: 1000 },
  { role: "typing", delay: 500 },
  {
    role: "ai",
    text: "Gói Standard bao gồm: tích hợp website, không giới hạn tin nhắn, phân tích cơ bản. Phù hợp cho doanh nghiệp vừa và nhỏ.",
    delay: 3000,
  },
] as const;

function ChatContent() {
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);

  useEffect(() => {
    const timers = CHAT_MESSAGES.map((msg, i) =>
      setTimeout(() => setVisibleMessages((prev) => [...prev, i]), msg.delay)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col bg-white pt-5">
      <div className="flex items-center gap-2.5 border-b border-gray-200 px-3 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <Bot className="h-3 w-3 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[8px] font-semibold text-gray-900">Trợ lý AI của bạn</p>
          <div className="flex items-center gap-1">
            <span className="text-[6px] text-gray-600/70">Đang hoạt động</span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-hidden px-3 py-3">
        {CHAT_MESSAGES.map((msg, i) => {
          if (msg.role === "typing") {
            return (
              <motion.div
                key={`typing-${i}`}
                className="flex"
                initial={{ opacity: 0, y: 8 }}
                animate={visibleMessages.includes(i) ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="flex items-center gap-1 rounded-xl rounded-bl-sm bg-gray-100 px-2.5 py-1.5">
                  {[0, 1, 2].map((d) => (
                    <motion.div
                      key={d}
                      className="h-1 w-1 rounded-full bg-gray-400"
                      animate={{ y: [0, -3, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: d * 0.15,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            );
          }

          const isAI = msg.role === "ai";
          return (
            <motion.div
              key={`${msg.role}-${i}`}
              className={`flex ${isAI ? "justify-start" : "justify-end"}`}
              initial={{ opacity: 0, y: 10, x: isAI ? -6 : 6 }}
              animate={
                visibleMessages.includes(i) ? { opacity: 1, y: 0, x: 0 } : { opacity: 0, y: 10 }
              }
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-2.5 py-1.5 text-[7px] leading-relaxed ${
                  isAI
                    ? "rounded-bl-sm bg-gray-100 text-gray-800"
                    : "rounded-br-sm bg-gradient-to-r from-primary to-accent text-white"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-auto flex items-center gap-1.5 border-t border-gray-200 p-3">
        <div className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-[7px] text-gray-400">
          Nhập tin nhắn...
        </div>
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent">
          <svg
            className="h-2.5 w-2.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function SceneInstallFlow() {
  const phase = usePhase(400, 800);

  return (
    <>
      <WebsiteContent dimmed tapPhase={phase >= 1 ? (phase >= 2 ? "tap" : "idle") : undefined} />
      {phase >= 2 && <InstallContent />}
    </>
  );
}

export function MockupPWA() {
  const scene = useSceneLoop();

  return (
    <div className="relative flex items-center justify-center py-4">
      <BackgroundEffects />

      <PhoneFrame>
        <div className="relative min-h-[26rem]">
          <SceneWrapper show={scene === 0}>
            <WebsiteContent dimmed={false} />
          </SceneWrapper>

          <SceneWrapper show={scene === 1}>
            <SceneInstallFlow />
          </SceneWrapper>

          <SceneWrapper show={scene === 2}>
            <HomeContent />
          </SceneWrapper>

          <SceneWrapper show={scene === 3}>
            <motion.div
              className="flex h-full w-full items-center justify-center"
              initial={{ scale: 0.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, mass: 0.6 }}
            >
              <LaunchContent />
            </motion.div>
          </SceneWrapper>

          <SceneWrapper show={scene === 4}>
            <ChatContent />
          </SceneWrapper>
        </div>
      </PhoneFrame>
    </div>
  );
}
