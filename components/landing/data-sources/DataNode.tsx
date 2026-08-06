"use client";

import { motion } from "framer-motion";
import type { DataSource } from "./data";

interface DataNodeProps {
  source: DataSource;
  index: number;
  onHover: (id: string | null) => void;
  reducedMotion: boolean;
}

export default function DataNode({
  source,
  index,
  onHover,
  reducedMotion: _reducedMotion,
}: DataNodeProps) {
  return (
    <motion.div
      data-node-id={source.id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        onMouseEnter={() => onHover(source.id)}
        onMouseLeave={() => onHover(null)}
        className="w-full max-w-44 cursor-pointer"
      >
        <div className="relative overflow-hidden rounded-lg border bg-white transition-shadow duration-200 hover:shadow-md">
          <div
            className="absolute left-0 top-0 h-full w-0.5"
            style={{ background: source.color }}
          />

          <div className="flex items-center gap-2 px-3 py-2 sm:gap-2.5 sm:px-4 sm:py-3">
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8"
              style={{ background: `color-mix(in srgb, ${source.color}, transparent 88%)` }}
            >
              <source.icon style={{ color: source.color }} size={14} strokeWidth={1.5} />
            </div>

            <span className="text-xs font-bold text-foreground sm:text-sm">{source.label}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
