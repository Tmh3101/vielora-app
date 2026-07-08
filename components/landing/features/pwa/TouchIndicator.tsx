"use client";

import { motion } from "framer-motion";

interface TouchIndicatorProps {
  x: number;
  y: number;
  phase: "hidden" | "idle" | "tap";
  delay?: number;
}

export function TouchIndicator({ x, y, phase, delay = 0 }: TouchIndicatorProps) {
  return (
    <motion.div
      className="pointer-events-none absolute z-50"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={false}
      animate={{
        opacity: phase === "hidden" ? 0 : 1,
        scale: phase === "hidden" ? 0.6 : 1,
      }}
      transition={{
        delay: phase === "hidden" ? 0 : delay,
        type: "spring",
        stiffness: 250,
        damping: 20,
        mass: 0.6,
      }}
    >
      <motion.div
        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/70 bg-white/25 backdrop-blur-[2px]"
        animate={
          phase === "idle"
            ? {
                scale: [1, 1.08, 1],
                opacity: [0.8, 1, 0.8],
              }
            : phase === "tap"
              ? { scale: [1, 0.82, 1] }
              : { scale: 1 }
        }
        transition={{
          duration: phase === "idle" ? 2 : 0.35,
          repeat: phase === "idle" ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-white/90" />
      </motion.div>

      {phase === "tap" && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/50"
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      )}
    </motion.div>
  );
}
