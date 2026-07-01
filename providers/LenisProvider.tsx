"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { cancelFrame, frame } from "framer-motion";
import { useEffect, useRef } from "react";

type DampedZone = { top: number; bottom: number; factor: number };
const dampedZones: DampedZone[] = [];

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    function update(data: { timestamp: number }) {
      lenisRef.current?.lenis?.raf(data.timestamp);
    }
    frame.update(update, true);
    return () => cancelFrame(update);
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        wheelMultiplier: 1,
        touchMultiplier: 2,
        anchors: true,
        autoRaf: false,
        virtualScroll: (e) => {
          const lenis = lenisRef.current?.lenis;
          if (!lenis) return true;
          const scroll = lenis.scroll;
          const zone = dampedZones.find((z) => scroll >= z.top && scroll <= z.bottom);
          if (zone) {
            e.deltaY /= zone.factor;
          }
          return true;
        },
      }}
    >
      {children}
    </ReactLenis>
  );
}
