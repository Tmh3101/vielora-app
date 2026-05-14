"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function UpgradeModal({
  open,
  onOpenChange,
  title = "Yêu cầu nâng cấp",
  description = "Nâng cấp gói của bạn để thêm hoặc chỉnh sửa nguồn kiến thức tùy chỉnh.",
}: UpgradeModalProps) {
  const router = useRouter();

  const handleViewPricing = () => {
    onOpenChange(false);
    router.push("/dashboard/upgrade");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="bg-gradient-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Gói Standard & Pro bao gồm:</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                <li>• Thêm & chỉnh sửa nguồn kiến thức không giới hạn</li>
                <li>• Nhiều credits hơn mỗi tháng</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleViewPricing}
            className="bg-gradient-primary btn-glow w-full text-primary-foreground"
          >
            <Crown className="h-4 w-4" />
            Xem gói nâng cấp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
