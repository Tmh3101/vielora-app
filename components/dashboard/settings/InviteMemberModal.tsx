"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Mail, Loader2, AlertCircle } from "lucide-react";
import { EWorkspaceRole } from "@/types/enums";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess: () => void;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role_id: EWorkspaceRole.Admin }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Không thể gửi lời mời");
      }

      toast.success(`Đã gửi lời mời đến ${email}`);
      setEmail("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      let errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra khi gửi lời mời";

      // Translate technical rate limit and DB exceptions to friendly Vietnamese messages
      if (errMsg.includes("Rate limit exceeded") || errMsg.includes("max 10 invitations")) {
        errMsg =
          "Đã vượt quá giới hạn gửi lời mời: Tối đa 10 lời mời/ngày cho mỗi workspace. Vui lòng thử lại vào ngày mai!";
      } else if (
        errMsg.includes("Invitation already sent") ||
        errMsg.includes("already sent to this email")
      ) {
        errMsg = "Lời mời đã được gửi đến địa chỉ email này trước đó và đang ở trạng thái chờ.";
      } else if (errMsg.includes("unique_workspace_user") || errMsg.includes("already a member")) {
        errMsg = "Người dùng có email này đã là thành viên của workspace.";
      }

      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent className="rounded-2xl border-border/80 bg-card p-6 shadow-xl sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="shadow-xs flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Mời thành viên
              </DialogTitle>
              <p className="text-xs text-muted-foreground">Gửi email mời thành viên workspace</p>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium leading-relaxed text-destructive animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs font-semibold text-foreground">
              Địa chỉ Email <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="dongnghiep@congty.com"
                className="h-10 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs transition-all focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="cursor-pointer rounded-xl border-border/60 bg-transparent text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !email.trim()}
              className="cursor-pointer rounded-xl bg-primary font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:bg-primary/90 hover:shadow-primary/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Gửi lời mời
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
