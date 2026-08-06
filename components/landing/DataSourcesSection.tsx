"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import DataNode from "./data-sources/DataNode";
import AIChatbotCore from "./data-sources/AIChatbotCore";
import ConnectionLines from "./data-sources/ConnectionLines";
import { ALL_SOURCES } from "./data-sources/data";

export default function DataSourcesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.4, 1, 1, 0.4]);

  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setTimeout(() => setReducedMotion(mq.matches), 0);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleHover = useCallback((id: string | null) => {
    setHoveredSource(id);
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-card/50 pt-20 lg:pt-28">
      <div className="absolute inset-0 bg-card" />
      <div className="dot-pattern pointer-events-none absolute inset-0 opacity-[0.18]" />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.65,

          backgroundImage: `
        linear-gradient(
          to right,
          hsl(var(--border) / .4) 1px,
          transparent 1px
        ),
        linear-gradient(
          to bottom,
          hsl(var(--border) / .4) 1px,
          transparent 1px
        )
      `,

          backgroundSize: "48px 48px",

          WebkitMaskImage: `
        linear-gradient(
          to top,
          black 0%,
          rgba(0,0,0,.2) 80%,
          transparent 100%
        )
      `,

          maskImage: `
        linear-gradient(
          to top,
          black 0%,
          rgba(0,0,0,.2) 80%,
          transparent 100%
        )
      `,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
        radial-gradient(
          ellipse at center,
          rgba(59,130,246,.10) 0%,
          rgba(59,130,246,.04) 35%,
          transparent 70%
        )
      `,
        }}
      />

      <div className="orb orb-primary -right-32 -top-32 h-64 w-64 opacity-45" />

      <motion.div
        className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        style={{ opacity }}
      >
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="heading-premium mb-4 text-3xl font-bold text-foreground sm:text-4xl"
          >
            Kho dữ liệu <span className="text-gradient-animated text-balance">da dạng</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-lg text-muted-foreground"
          >
            Thu thập và xử lý dữ liệu từ website, blog, tin tức đến tài liệu, bảng tính một cách tự
            động để làm kho tri thức cho trợ lý AI của bạn.
          </motion.p>
        </div>

        <div ref={gridRef} className="relative mt-12 lg:mt-16" style={{ minHeight: "460px" }}>
          <ConnectionLines hoveredSource={hoveredSource} gridRef={gridRef} coreRef={coreRef} />

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-10 lg:gap-40">
            <div className="flex flex-col items-end justify-center gap-3">
              {ALL_SOURCES.filter((s) => ["website", "blog", "news"].includes(s.id)).map(
                (source, i) => (
                  <DataNode
                    key={source.id}
                    source={source}
                    index={i}
                    onHover={handleHover}
                    reducedMotion={reducedMotion}
                  />
                )
              )}
            </div>

            <div ref={coreRef} className="flex items-center justify-center self-center">
              <AIChatbotCore reducedMotion={reducedMotion} />
            </div>

            <div className="flex flex-col items-start justify-center gap-3">
              {ALL_SOURCES.filter((s) => ["pdf", "docx", "md", "csv", "txt"].includes(s.id)).map(
                (source, i) => (
                  <DataNode
                    key={source.id}
                    source={source}
                    index={i + 3}
                    onHover={handleHover}
                    reducedMotion={reducedMotion}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
