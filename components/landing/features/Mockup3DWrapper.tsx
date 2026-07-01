"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface Mockup3DWrapperProps {
  children: ReactNode;
  overflowVisible?: boolean;
  innerClassName?: string;
}

export function Mockup3DWrapper({
  children,
  overflowVisible,
  innerClassName,
}: Mockup3DWrapperProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [10, 0]), {
    stiffness: 150,
    damping: 25,
  });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [0, 20]), {
    stiffness: 150,
    damping: 25,
  });

  const handlePointerMove = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handlePointerLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <div className="relative flex items-center justify-center">
      <div className="pointer-events-none absolute -inset-16 opacity-80">
        <div className="h-full w-full rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="[transform-style:preserve-3d]"
        style={{ perspective: "1400px" }}
      >
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="[transform-style:preserve-3d]"
          style={{ rotateX, rotateY }}
        >
          <div className="[transform-style:preserve-3d]">
            <div
              className="pointer-events-none absolute -inset-x-px -inset-y-px z-10 rounded-2xl"
              style={{
                transform: "translateZ(58px)",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 50%, transparent 100%)",
              }}
            />

            <div
              className={`relative rounded-2xl bg-card [transform-style:preserve-3d] ${
                overflowVisible ? "overflow-visible" : "overflow-hidden"
              } ${innerClassName || "p-6"}`}
              style={{
                boxShadow:
                  "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), 0 32px 64px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {children}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
