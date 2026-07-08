"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface PhoneFrameProps {
  children: ReactNode;
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="[transform-style:preserve-3d]" style={{ perspective: "1200px" }}>
      <motion.div
        className="relative mx-auto w-52 [transform-style:preserve-3d]"
        style={{
          rotateX: 6,
          rotateY: 12,
          transformOrigin: "center center",
        }}
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="rounded-[2.5rem] border border-gray-400/80 bg-black/70 p-[4px] shadow-2xl shadow-black/20">
          <div className="relative overflow-hidden rounded-[calc(2.5rem-3px)] bg-white">
            <div className="absolute left-1/2 top-[5px] z-20 h-[16px] w-[58px] -translate-x-1/2 rounded-full bg-black">
              <div className="mx-auto mt-[3px] h-[9px] w-[32px] rounded-full bg-gray-700" />
            </div>

            <div className="relative min-h-[26rem]" style={{ transformStyle: "preserve-3d" }}>
              {children}
            </div>

            <div
              className="pointer-events-none absolute inset-0 z-30"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, transparent 100%)",
              }}
            />
          </div>
        </div>

        <div
          className="pointer-events-none absolute -inset-3 -z-10 rounded-[3rem] opacity-30 blur-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, transparent 60%)",
          }}
        />
      </motion.div>
    </div>
  );
}
