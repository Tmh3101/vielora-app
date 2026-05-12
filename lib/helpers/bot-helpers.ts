import type { Tables } from "@/lib/supabase/types";
import { EBotStatus } from "@/types";

/**
 * Compute the display label and CSS classes for a bot's status.
 *
 * @param bot - The bot record used to determine status and stopped state
 * @returns An object with `label` (display text) and `className` (CSS classes for badge styling)
 */
export const getBotStatusLabel = (bot: Tables<"bots">) => {
  if (bot.is_stopped) {
    return {
      label: "Đã dừng",
      className: "bg-slate-100 text-slate-700 hover:bg-slate-100",
    };
  }

  if (bot.status === EBotStatus.Ready) {
    return {
      label: "Hoạt động",
      className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    };
  }

  if (bot.status === EBotStatus.Failed) {
    return {
      label: "Lỗi",
      className: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    };
  }

  return {
    label: "Đang xử lý",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  };
};

export const getStatusColor = (status: string, isStopped: boolean) => {
  if (isStopped) return "bg-gray-500";
  switch (status) {
    case EBotStatus.Ready:
      return "bg-green-500";
    case EBotStatus.Discovering:
    case EBotStatus.Discovered:
    case EBotStatus.Indexing:
      return "bg-yellow-500";
    case EBotStatus.Failed:
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

export const getStatusText = (status: string, isStopped: boolean) => {
  if (isStopped) return "Đã dừng";
  switch (status) {
    case EBotStatus.Ready:
      return "Sẵn sàng";
    case EBotStatus.Discovering:
      return "Đang khám phá";
    case EBotStatus.Discovered:
      return "Đã khám phá";
    case EBotStatus.Indexing:
      return "Đang index";
    case EBotStatus.Failed:
      return "Lỗi";
    default:
      return "Chờ xử lý";
  }
};

// Check bot status and determine availability
export const getBotStatusInfo = (status: string, isStopped: boolean) => {
  if (isStopped) {
    return {
      isAvailable: false,
      message: "Bot is temporarily suspended. Please contact the administrator.",
    };
  }
  switch (status) {
    case EBotStatus.Ready:
      return { isAvailable: true, message: null };
    case EBotStatus.Pending:
      return {
        isAvailable: false,
        message: "Bot is being set up. Please wait a moment and refresh the page.",
      };
    case EBotStatus.Discovering:
      return { isAvailable: false, message: "Bot is discovering your website..." };
    case EBotStatus.Discovered:
      return { isAvailable: false, message: "Bot is preparing data..." };
    case EBotStatus.Indexing:
      return { isAvailable: false, message: "Bot is processing and indexing data..." };
    case EBotStatus.Failed:
      return {
        isAvailable: false,
        message: "Bot encountered an error during setup. Please try again later.",
      };
    default:
      return { isAvailable: false, message: "Bot is not ready yet. Please wait a moment." };
  }
};
