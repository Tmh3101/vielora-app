"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bot, Crown, Loader2 } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";

type BotType = Tables<"bots">;

export interface BotSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bots: BotType[];
  selectedBotIds: Set<string>;
  botsLimit: number;
  planName: string;
  isSavingBotSelection: boolean;
  onToggleBotSelection: (botId: string) => void;
  onUpgrade: () => void;
  onConfirm: () => Promise<void>;
}

export function BotSelectorDialog({
  open,
  onOpenChange,
  bots,
  selectedBotIds,
  botsLimit,
  planName,
  isSavingBotSelection,
  onToggleBotSelection,
  onUpgrade,
  onConfirm,
}: BotSelectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Chọn chatbot hoạt động</DialogTitle>
          <DialogDescription className="pt-2 text-base">
            Gói <span className="font-semibold capitalize text-foreground">{planName}</span> cho
            phép tối đa <span className="font-semibold text-foreground">{botsLimit}</span> chatbot.
            Chọn chatbot bạn muốn kích hoạt.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {bots.map((bot) => {
            const isSelected = selectedBotIds.has(bot.id);
            const isDisabled = !isSelected && selectedBotIds.size >= botsLimit;
            return (
              <label
                key={bot.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "border-primary/50 bg-primary/5"
                    : isDisabled
                      ? "cursor-not-allowed border-border/40 opacity-50"
                      : "border-border/60 hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={isDisabled}
                  onCheckedChange={() => onToggleBotSelection(bot.id)}
                />
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
                    {bot.avatar_url ? (
                      <Image
                        src={bot.avatar_url}
                        alt={bot.name}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                        unoptimized={
                          bot.avatar_url.startsWith("blob:") || bot.avatar_url.startsWith("data:")
                        }
                      />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{bot.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{bot.domain}</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium ${
                    isSelected ? "text-green-600" : "text-muted-foreground"
                  }`}
                >
                  {isSelected ? "Hoạt động" : "Đã dừng"}
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Đã chọn</span>
          <span className="font-medium">
            {selectedBotIds.size}/{botsLimit}
          </span>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Button
            variant="outline"
            onClick={onUpgrade}
            className="w-full hover:bg-white hover:text-foreground sm:w-auto"
          >
            <Crown className="mr-2 h-4 w-4" />
            Nâng cấp gói
          </Button>
          <Button
            onClick={() => void onConfirm()}
            disabled={isSavingBotSelection || selectedBotIds.size === 0}
            className="bg-gradient-primary btn-glow w-full sm:w-auto"
          >
            {isSavingBotSelection ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Xác nhận"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
