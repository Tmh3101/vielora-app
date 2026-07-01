"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Mockup3DWrapper } from "./Mockup3DWrapper";

export function MockupCrawl() {
  return (
    <Mockup3DWrapper innerClassName="px-4 py-6 lg:min-w-[380px]">
      <div className="mb-3 flex items-center gap-2" style={{ transform: "translateZ(8px)" }}>
        <span className="flex h-2 w-2 rounded-full bg-green-500" />
        <span className="text-xs font-extrabold uppercase text-foreground">
          Tự động thu thập dữ liệu
        </span>
      </div>

      <div className="mb-4" style={{ transform: "translateZ(20px)" }}>
        <p className="mb-2 text-[11px] text-muted-foreground">URL website</p>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 pr-8 text-[11px] text-muted-foreground/70">
            <svg
              className="h-3 w-3 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            https://your-website-url.com
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xl font-light leading-none text-white"
            style={{ transform: "translateZ(32px)" }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>

      <div className="mb-4" style={{ transform: "translateZ(26px)" }}>
        <p className="mb-2 text-[11px] text-muted-foreground">Tệp dữ liệu</p>
        <div className="space-y-1.5">
          {[
            { name: "data.pdf", done: true },
            { name: "bao-cao.docx", done: true },
            { name: null, done: false },
          ].map((file, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10, z: -20 }}
              animate={{ opacity: 1, x: 0, z: 0 }}
              transition={{
                delay: i * 0.1,
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] ${
                file.name
                  ? "border border-primary/10 bg-primary/5 text-foreground"
                  : "border border-dashed border-border/30 text-muted-foreground"
              }`}
            >
              {file.name ? (
                <>
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-border/30 bg-background/80">
                    {file.name.endsWith(".pdf") ? (
                      <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                        <path
                          d="M5 4a2 2 0 0 1 2-2h5.5l6.5 6.5V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4z"
                          fill="#ef4444"
                          fillOpacity="0.18"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M12.5 2v6.5H19"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                        <path
                          d="M5 4a2 2 0 0 1 2-2h5.5l6.5 6.5V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4z"
                          fill="#2563eb"
                          fillOpacity="0.18"
                          stroke="#2563eb"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M12.5 2v6.5H19"
                          stroke="#2563eb"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 text-xs">{file.name}</span>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/15 text-[9px] font-bold text-green-500">
                    ✓
                  </span>
                </>
              ) : (
                <span className="w-full text-center text-[10px]">+ Tải lên tệp</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.45,
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="rounded-lg bg-primary/[0.04] p-3"
        style={{ transform: "translateZ(36px)" }}
      >
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Đang quét: 5/12 trang</span>
          <span className="font-medium text-primary">42%</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-border/20"
          style={{ transform: "translateZ(8px)" }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "42%" }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
          />
        </div>
      </motion.div>
    </Mockup3DWrapper>
  );
}
