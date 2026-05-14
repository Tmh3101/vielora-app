"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Crown } from "lucide-react";

export interface BotLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanLabel: string;
  botsLimit: number;
  botsCount: number;
  creditsUsedThisMonth: number;
  creditsTotalThisMonth: number;
  onUpgrade: () => void;
}

export function BotLimitDialog({
  open,
  onOpenChange,
  currentPlanLabel,
  botsLimit,
  botsCount,
  creditsUsedThisMonth,
  creditsTotalThisMonth,
  onUpgrade,
}: BotLimitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
          <DialogTitle className="text-xl">Đã đạt giới hạn chatbot</DialogTitle>
          <DialogDescription className="pt-2 text-base">
            Gói <span className="font-semibold capitalize text-foreground">{currentPlanLabel}</span>{" "}
            cho phép tối đa <span className="font-semibold text-foreground">{botsLimit}</span>{" "}
            chatbot.
            <br />
            Bạn đã tạo <span className="font-semibold text-foreground">{botsCount}</span>/
            {botsLimit}
            chatbot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl bg-muted/50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Gói hiện tại</span>
            <span className="font-medium capitalize">{currentPlanLabel}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Chatbot đã tạo</span>
            <span className="font-medium">
              {botsCount}/{botsLimit}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Credits đã dùng</span>
            <span className="font-medium">
              {creditsUsedThisMonth.toLocaleString()}/{creditsTotalThisMonth.toLocaleString()}
            </span>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full hover:bg-white hover:text-foreground sm:w-auto"
          >
            Đóng
          </Button>
          <Button onClick={onUpgrade} className="bg-gradient-primary btn-glow w-full sm:w-auto">
            <Crown className="mr-2 h-4 w-4" />
            Nâng cấp gói
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
