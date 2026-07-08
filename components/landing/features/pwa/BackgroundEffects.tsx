"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Particle {
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  y: number;
}

export function BackgroundEffects() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParticles(
        Array.from({ length: 6 }, () => ({
          left: `${15 + Math.random() * 70}%`,
          top: `${15 + Math.random() * 70}%`,
          size: Math.random() > 0.5 ? 2 : 1.5,
          duration: 3 + Math.random() * 4,
          delay: Math.random() * 2,
          y: -(8 + Math.random() * 12),
        }))
      );
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-visible">
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2">
        <div className="h-full w-full rounded-full bg-primary/15 blur-[100px] will-change-transform" />
      </div>

      <div className="absolute left-[55%] top-[42%] h-48 w-48">
        <div className="h-full w-full rounded-full bg-accent/10 blur-[80px] will-change-transform" />
      </div>

      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/20 will-change-transform"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
          }}
          animate={{
            y: [0, p.y, 0],
            opacity: [0.15, 0.5, 0.15],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <div
        className="absolute left-[30%] top-[30%] h-32 w-32 rotate-45 opacity-[0.04]"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)",
        }}
      />
    </div>
  );
}
