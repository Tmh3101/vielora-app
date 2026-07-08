"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AIChatbotCoreProps {
  reducedMotion?: boolean;
}

const MESSAGES = [
  "Tôi có thể giúp gì cho bạn?",
  "Khám phá dữ liệu ngay!",
  "Kết nối thông minh ✨",
  "Trợ lý AI của bạn",
  "Hỏi tôi bất cứ điều gì! 💡",
];

export default function AIChatbotCore({ reducedMotion = false }: AIChatbotCoreProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reducedMotion) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const next = () => {
      setVisible(false);
      timeoutId = setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 600);
    };
    const t = setInterval(next, 5000);
    return () => {
      clearInterval(t);
      clearTimeout(timeoutId);
    };
  }, [reducedMotion]);

  return (
    <div className="relative flex items-center justify-center">
      {/* Chat Bubbles */}
      {!reducedMotion && (
        <motion.div
          animate={{
            y: [-4, 4, -4],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute z-30"
          style={{
            top: "-48px",
            left: "-100px",
          }}
        >
          <AnimatePresence mode="wait">
            {visible && (
              <motion.div
                key={msgIndex}
                initial={{
                  opacity: 0,
                  scale: 0.8,
                  x: -12,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.85,
                  x: -8,
                }}
                transition={{
                  duration: 0.35,
                }}
              >
                <div
                  className="relative whitespace-nowrap rounded-2xl border border-white/60 bg-white/95 px-4 py-2.5 text-xs font-medium text-foreground backdrop-blur-md"
                  style={{
                    boxShadow: `
                0 10px 30px rgba(0,0,0,.08),
                0 4px 10px rgba(59,130,246,.08)
              `,
                  }}
                >
                  {MESSAGES[msgIndex]}
                  <div className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 border-b border-r border-white/60 bg-white/95" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <motion.div
        animate={
          reducedMotion
            ? {}
            : {
                scale: [1, 1.08, 1],
                opacity: [0.15, 0.25, 0.15],
              }
        }
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute h-[260px] w-[260px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,.35), rgba(6,182,212,.18), transparent 70%)",
        }}
      />

      <motion.div
        animate={
          reducedMotion
            ? {}
            : {
                scale: [1, 1.12, 1],
              }
        }
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute h-[340px] w-[340px] rounded-full blur-[120px]"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,.10), transparent 70%)",
        }}
      />

      {[0, 2].map((delay) => (
        <motion.div
          key={delay}
          initial={{
            scale: 0.8,
            opacity: 0.25,
          }}
          animate={
            reducedMotion
              ? {}
              : {
                  scale: 2,
                  opacity: 0,
                }
          }
          transition={{
            duration: 4,
            delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className="absolute h-28 w-28 rounded-full border border-primary/20"
        />
      ))}

      <motion.div
        animate={
          reducedMotion
            ? {}
            : {
                rotate: 360,
              }
        }
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute h-40 w-40 rounded-full border border-primary/10"
        style={{
          transform: "rotateX(72deg)",
        }}
      >
        <motion.div
          animate={
            reducedMotion
              ? {}
              : {
                  rotate: -360,
                }
          }
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/70"
        />
      </motion.div>

      <motion.div
        animate={
          reducedMotion
            ? {}
            : {
                rotate: -360,
              }
        }
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute h-48 w-48 rounded-full border border-primary/5"
        style={{
          transform: "rotateY(70deg)",
        }}
      >
        <motion.div
          animate={
            reducedMotion
              ? {}
              : {
                  rotate: 360,
                }
          }
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-violet-400 shadow-lg shadow-violet-400/70"
        />
      </motion.div>

      <motion.div
        animate={
          reducedMotion
            ? {}
            : {
                y: [-5, 5, -5],
              }
        }
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative"
      >
        <div className="absolute inset-[-10px] rounded-full border border-white/10 bg-white/5 backdrop-blur-md" />

        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(90deg,#3c83f6 0%,#0ea5e9 100%)",
            boxShadow: `
              0 25px 60px rgba(59,130,246,.35),
              inset 0 3px 8px rgba(255,255,255,.35),
              inset 0 -6px 12px rgba(0,0,0,.12)
            `,
          }}
        >
          <Bot className="relative z-10 h-10 w-10 text-white" />
        </div>

        {/* Floating Logo */}

        <motion.div
          animate={
            reducedMotion
              ? {}
              : {
                  y: [-3, 3, -3],
                }
          }
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
          className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white shadow-2xl shadow-primary backdrop-blur-md"
        >
          <Image src="/images/logo-icon.png" alt="Vielora" width={24} height={24} />
        </motion.div>
      </motion.div>
    </div>
  );
}
