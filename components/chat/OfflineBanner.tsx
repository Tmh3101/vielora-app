"use client";

import { useEffect, useReducer, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { BannerState } from "@/types";
import { BannerActionType, BannerAction } from "@/lib/constants";

interface OfflineBannerProps {
  isOnline: boolean;
}

function bannerReducer(state: BannerState, action: BannerAction): BannerState {
  switch (action.type) {
    case BannerActionType.GO_OFFLINE:
      return BannerState.Offline;
    case BannerActionType.RECOVER:
      return BannerState.Recovering;
    case BannerActionType.HIDE:
      return BannerState.Hidden;
    default:
      return state;
  }
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  const [state, dispatch] = useReducer(bannerReducer, BannerState.Hidden);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      dispatch({ type: BannerActionType.GO_OFFLINE });
    } else if (wasOfflineRef.current) {
      dispatch({ type: BannerActionType.RECOVER });
    }
  }, [isOnline]);

  useEffect(() => {
    if (state !== BannerState.Recovering) return;
    const timer = window.setTimeout(() => {
      dispatch({ type: BannerActionType.HIDE });
      wasOfflineRef.current = false;
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [state]);

  const visible = state !== BannerState.Hidden;
  const isRecovering = state === BannerState.Recovering;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`h-[30px] overflow-hidden ${isRecovering ? "bg-emerald-500" : "bg-amber-500"}`}
        >
          <div className="flex h-full items-center justify-center gap-2 px-4 text-xs font-medium text-white">
            {isRecovering ? (
              <>
                <Wifi className="h-3.5 w-3.5 shrink-0" />
                <span>Kết nối mạng được khôi phục!</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 shrink-0" />
                <span>Mất kết nối mạng. Bạn đang ở chế độ ngoại tuyến.</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
