"use client";

import { motion } from "framer-motion";
import { Mockup3DWrapper } from "./Mockup3DWrapper";

export function MockupPWA() {
  return (
    <Mockup3DWrapper overflowVisible>
      <div className="relative w-48">
        <div
          className="rounded-[2rem] border-2 border-border/60 bg-card p-2"
          style={{ transform: "translateZ(0px)" }}
        >
          <div className="mb-3 flex justify-center" style={{ transform: "translateZ(10px)" }}>
            <div className="h-3 w-20 rounded-full bg-border/60" />
          </div>
          <div className="space-y-2 px-1" style={{ transform: "translateZ(10px)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "75%" }}
              className="h-2 rounded bg-primary/20"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "50%" }}
              transition={{ delay: 0.15 }}
              className="h-2 rounded bg-primary/10"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "65%" }}
              transition={{ delay: 0.3 }}
              className="h-2 rounded bg-primary/20"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "40%" }}
              transition={{ delay: 0.45 }}
              className="h-2 rounded bg-primary/10"
            />
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: 0.5,
            type: "spring",
            stiffness: 200,
            damping: 20,
          }}
          className="shadow-glow absolute -bottom-20 -right-8 w-44 rounded-xl border border-primary/20 bg-card p-3"
          style={{ z: 24 }}
        >
          <p
            className="mb-1 text-xs font-semibold text-foreground"
            style={{ transform: "translateZ(6px)" }}
          >
            Thêm vào màn hình chính
          </p>
          <p className="mb-3 text-[10px] leading-relaxed text-muted-foreground">
            Cài đặt chatbot như một ứng dụng độc lập
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="bg-gradient-primary w-full rounded-lg py-1.5 text-xs font-medium text-white"
            style={{ z: 8 }}
          >
            Cài đặt ngay
          </motion.button>
        </motion.div>
      </div>
    </Mockup3DWrapper>
  );
}
