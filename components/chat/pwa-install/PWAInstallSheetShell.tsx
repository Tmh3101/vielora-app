"use client";

import type { ReactNode } from "react";
import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface PWAInstallSheetShellProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  showSubtitle?: boolean;
  subtitle?: string;
  children: ReactNode;
}

export function PWAInstallSheetShell({
  open,
  onClose,
  titleId,
  title,
  showSubtitle = false,
  subtitle = "",
  children,
}: PWAInstallSheetShellProps) {
  const sheetRef = useFocusTrap(open);
  const stableOnClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") stableOnClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, stableOnClose]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Đóng hướng dẫn cài đặt"
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={stableOnClose}
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-popover p-6 shadow-lg"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-foreground">
                  {title}
                </h2>
                {showSubtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={stableOnClose}
                className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
