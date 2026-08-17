"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { inviteMemberApi } from "@/lib/api/group-chat";
import { GroupMemberRow } from "@/lib/services/group-chat.service";

interface InviteMemberFormProps {
  botId: string;
  currentCount: number;
  onMemberInvited: (member: GroupMemberRow) => void;
}

export function InviteMemberForm({ botId, currentCount, onMemberInvited }: InviteMemberFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isFull = currentCount >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isFull || loading) return;

    setLoading(true);
    try {
      const res = await inviteMemberApi(botId, email);
      if (res.success && res.data) {
        toast({
          title: "Thành công",
          description: res.isNewAccount
            ? `Đã tạo tài khoản mới và gửi email mời tham gia tới ${email}`
            : `Đã thêm ${email} vào nhóm chat.`,
        });
        setEmail("");
        onMemberInvited(res.data);
      } else {
        toast({
          title: "Không thể thêm thành viên",
          description: res.message || "Đã xảy ra lỗi khi thêm thành viên.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Invite error:", err);
      toast({
        title: "Lỗi",
        description: "Không thể kết nối đến máy chủ.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:flex-row">
      <div className="relative flex-1">
        <Input
          type="email"
          placeholder="Nhập email người dùng muốn mời vào nhóm..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isFull || loading}
          className="rounded-xl border-border/60 bg-background/50 text-sm focus-visible:ring-primary/20"
          required
        />
      </div>
      <Button
        type="submit"
        disabled={isFull || loading || !email.trim()}
        className="shadow-xs shrink-0 rounded-xl font-semibold"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Thêm thành viên
      </Button>
    </form>
  );
}
