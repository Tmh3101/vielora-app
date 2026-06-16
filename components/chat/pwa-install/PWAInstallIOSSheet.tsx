"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { EIOSBrowser } from "@/types/enums";
import { IOSInstallInstructions } from "./IOSInstallInstructions";

interface PWAInstallIOSSheetProps {
  appName: string;
  browser: EIOSBrowser;
  open: boolean;
  onClose: () => void;
}

export function PWAInstallIOSSheet({ appName, browser, open, onClose }: PWAInstallIOSSheetProps) {
  const isBrave = browser === EIOSBrowser.Brave;

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
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-sheet-title"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-popover p-6 shadow-lg"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="pwa-install-sheet-title" className="text-lg font-semibold text-foreground">
                  {isBrave ? "Không thể cài đặt trên Brave" : `Cài đặt ${appName}`}
                </h2>
                {!isBrave && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Thêm ứng dụng vào Màn hình chính để truy cập nhanh hơn.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <IOSInstallInstructions browser={browser} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
