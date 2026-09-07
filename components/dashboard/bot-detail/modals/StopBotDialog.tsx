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
import { Loader2, Square } from "lucide-react";
import { useTranslations } from "next-intl";

export interface StopBotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isStoppingBot: boolean;
  onConfirm: () => Promise<void>;
}

export function StopBotDialog({
  open,
  onOpenChange,
  isStoppingBot,
  onConfirm,
}: StopBotDialogProps) {
  const t = useTranslations("dashboard.botDetail.settingsTab");
  const tCommon = useTranslations("dashboard.common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Square className="h-5 w-5" />
            {t("stopBot")}
          </DialogTitle>
          <DialogDescription>{t("deleteBotWarning")}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isStoppingBot}>
            {tCommon("cancel")}
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} disabled={isStoppingBot}>
            {isStoppingBot ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tCommon("loading")}
              </>
            ) : (
              t("stopBot")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
