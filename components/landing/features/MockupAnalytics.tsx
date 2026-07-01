"use client";

import { motion } from "framer-motion";
import { Mockup3DWrapper } from "./Mockup3DWrapper";

export function MockupAnalytics() {
  const metrics = [
    { label: "Tin nhắn", value: "12,847", change: "+23.5%", color: "text-primary" },
    { label: "Lead Form", value: "847", change: "+12.1%", color: "text-primary" },
    { label: "Chuyển đổi", value: "34.2%", change: "+5.8%", color: "text-green-500" },
  ];

  return (
    <Mockup3DWrapper>
      <p
        className="mb-3 text-xs font-medium text-muted-foreground"
        style={{ transform: "translateZ(8px)" }}
      >
        Dashboard Hiệu suất
      </p>
      <div className="mb-5 grid grid-cols-3 gap-2" style={{ transform: "translateZ(14px)" }}>
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
            className="rounded-lg border border-border/50 bg-background/50 p-2.5 text-center"
          >
            <p className="text-base font-bold tabular-nums text-foreground">{m.value}</p>
            <p className="mb-0.5 text-[10px] text-muted-foreground">{m.label}</p>
            <p className={`text-[10px] font-medium ${m.color}`}>{m.change}</p>
          </motion.div>
        ))}
      </div>
      <div className="space-y-1.5" style={{ transform: "translateZ(18px)" }}>
        {[
          { label: "Hiệu suất AI", width: 85 },
          { label: "Tương tác", width: 62 },
          { label: "Giữ chân", width: 48 },
        ].map((row, i) => (
          <div key={row.label} className="flex items-center gap-2">
            <span className="w-16 text-[10px] text-muted-foreground">{row.label}</span>
            <div className="flex-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${row.width}%` }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: "easeOut" }}
                className="bg-gradient-primary h-2 rounded"
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">{row.width}%</span>
          </div>
        ))}
      </div>
    </Mockup3DWrapper>
  );
}
