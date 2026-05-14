"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface ElegantProgressProps {
  title: string;
  currentAction: string;
  crawledCount?: number;
  progress?: number;
}

export function ElegantProgress({
  title,
  currentAction,
  crawledCount,
  progress,
}: ElegantProgressProps) {
  const message = currentAction || "Đang xử lý, vui lòng đợi...";
  const isUrl = message.includes("://") || message.startsWith("/");

  return (
    <div className="mx-4 max-w-4xl space-y-3 py-2">
      <div className="flex items-center gap-2 text-lg font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <p>{title}</p>
      </div>
      {progress != null && (
        <div className="mx-6">
          <Progress
            value={Math.min(100, Math.max(0, Math.round(progress)))}
            className="h-2 rounded-full transition-all"
          />
        </div>
      )}
      <div className="mx-6 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <div className="relative h-6 min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={message}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex min-w-0 items-center gap-1.5"
            >
              {isUrl ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  <span className="truncate">{message}</span>
                </>
              ) : (
                <span className="truncate">{message}</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {crawledCount != null && crawledCount > 0 && (
          <span className="shrink-0 rounded-full bg-green-600/20 px-2 py-0.5 text-xs text-green-600">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={crawledCount}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-semibold"
              >
                {crawledCount}
              </motion.span>
            </AnimatePresence>
            <span>{"  trang"}</span>
          </span>
        )}
      </div>
    </div>
  );
}
