"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { GroupChatRow, GroupMemberRow } from "@/lib/services/group-chat.service";
import { fetchGroup, createGroup, updateGroupStatusApi } from "@/lib/api/group-chat";
import { GROUP_CHAT_REQUIRES_PRO_CODE } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  ExternalLink,
  Loader2,
  Sparkles,
  AlertCircle,
  PlusCircle,
  Share2,
  Settings,
  MessageSquare,
  FileText,
  ArrowRight,
} from "lucide-react";
import type { Tables } from "@/lib/supabase/types";
import { InviteMemberForm } from "./InviteMemberForm";
import { MemberList } from "./MemberList";
import { GroupNotesList } from "./GroupNotesList";
import { InsightsList } from "./InsightsList";

import { getGroupChatUrl } from "@/lib/utils/standalone-chat-url";

interface GroupManagementProps {
  bot: Tables<"bots">;
  onNavigateToSettings?: () => void;
}

export function GroupManagement({ bot, onNavigateToSettings }: GroupManagementProps) {
  const botId = bot.id;
  const botSlug = bot.slug;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [group, setGroup] = useState<GroupChatRow | null>(null);
  const [members, setMembers] = useState<GroupMemberRow[]>([]);
  const [proRequired, setProRequired] = useState(false);

  const isStandaloneChatEnabled = Boolean(bot.is_public && botSlug && botSlug.trim().length > 0);

  const loadGroupData = useCallback(async () => {
    if (!isStandaloneChatEnabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setProRequired(false);
    try {
      const res = await fetchGroup(botId);
      if (res.success && res.data) {
        setGroup(res.data.group);
        setMembers(res.data.members || []);
      } else if (res.code === GROUP_CHAT_REQUIRES_PRO_CODE) {
        setProRequired(true);
      } else {
        toast({
          title: "Lỗi",
          description: res.message || "Không thể tải dữ liệu nhóm chat.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error loading group:", err);
      toast({
        title: "Lỗi",
        description: "Không thể kết nối đến máy chủ.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [botId, isStandaloneChatEnabled, toast]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  const handleCreateGroup = async () => {
    setCreating(true);
    try {
      const res = await createGroup(botId);
      if (res.success && res.data) {
        setGroup(res.data);
        toast({
          title: "Thành công",
          description: "Đã khởi tạo nhóm chat cho bot.",
        });
        loadGroupData();
      } else if (res.code === GROUP_CHAT_REQUIRES_PRO_CODE) {
        setProRequired(true);
        toast({
          title: "Gói không đủ quyền",
          description: res.message || "Vui lòng nâng cấp gói Pro hoặc Enterprise.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Không thể tạo nhóm",
          description: res.message || "Đã xảy ra lỗi khi khởi tạo nhóm chat.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error creating group:", err);
      toast({
        title: "Lỗi",
        description: "Không thể kết nối đến máy chủ.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (checked: boolean) => {
    if (!group) return;
    const newStatus = checked ? "active" : "disabled";
    setTogglingStatus(true);
    try {
      const res = await updateGroupStatusApi(botId, newStatus);
      if (res.success && res.data) {
        setGroup(res.data);
        toast({
          title: "Cập nhật trạng thái",
          description: checked ? "Nhóm chat đã được kích hoạt." : "Nhóm chat đã bị tạm dừng.",
        });
      } else {
        toast({
          title: "Lỗi",
          description: res.message || "Không thể cập nhật trạng thái nhóm.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error toggling status:", err);
      toast({
        title: "Lỗi",
        description: "Không thể kết nối đến máy chủ.",
        variant: "destructive",
      });
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* Standalone Chat Disabled Guidance Card */
  if (!isStandaloneChatEnabled) {
    return (
      <Card className="overflow-hidden rounded-2xl border border-amber-500/30 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-amber-500/50">
        <CardHeader className="border-b border-border/40 bg-amber-500/10 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Yêu cầu kích hoạt Trang Chat Độc Lập
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Tính năng Nhóm chat hoạt động trên nền tảng Trang chat độc lập. Bạn cần bật tính
                năng này và thiết lập đường dẫn (slug) trước khi cấu hình Nhóm chat.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="space-y-2.5 rounded-xl border border-border/40 bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
              Các bước cần thực hiện:
            </p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                Mở tab <strong>Cài đặt</strong> của Bot (hoặc bấm nút bên dưới).
              </li>
              <li>
                Tại mục <strong>Trang chat độc lập</strong>, bật công tắc{" "}
                <strong>Công khai trang chat</strong>.
              </li>
              <li>
                Nhập và lưu <strong>Đường dẫn tùy chỉnh (Slug)</strong> cho Bot.
              </li>
            </ol>
          </div>

          {onNavigateToSettings && (
            <Button
              onClick={onNavigateToSettings}
              className="shadow-xs flex items-center gap-2 rounded-xl font-semibold"
            >
              <Settings className="h-4 w-4" />
              Đi tới Cài đặt
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  /* Pro Plan Required Card */
  if (proRequired) {
    return (
      <Card className="overflow-hidden rounded-2xl border border-amber-500/30 bg-card/60 shadow-sm backdrop-blur-md">
        <CardHeader className="border-b border-border/40 bg-amber-500/10 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Yêu cầu Nâng cấp Gói Dịch vụ
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Tính năng Nhóm chat riêng tư (Group Chat) chỉ dành cho khách hàng sử dụng gói{" "}
                <strong>Pro</strong> hoặc <strong>Enterprise</strong>.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <Button
            asChild
            className="shadow-xs rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white hover:from-amber-600 hover:to-orange-600"
          >
            <Link href="/dashboard/upgrade">Nâng cấp gói ngay →</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* Empty Group State Card */
  if (!group) {
    return (
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 p-8 text-center shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <CardHeader className="border-0 bg-transparent p-0">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            Chưa có Nhóm Chat cho Bot này
          </CardTitle>
          <CardDescription className="mx-auto mt-1.5 max-w-md text-xs text-muted-foreground">
            Tạo nhóm chat riêng tư để tối đa 5 thành viên có thể cùng trao đổi trực tiếp với Bot
            trong cùng một cuộc trò chuyện.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-6 p-0">
          <Button
            onClick={handleCreateGroup}
            disabled={creating}
            size="lg"
            className="shadow-xs rounded-xl font-semibold"
          >
            {creating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <PlusCircle className="h-5 w-5" />
            )}
            Tạo Nhóm Chat Mới
          </Button>
        </CardContent>
      </Card>
    );
  }

  const pwaGroupUrl = botSlug ? getGroupChatUrl(botSlug) : undefined;

  return (
    <div className="space-y-6">
      {/* Group Header & Status Card */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-base font-semibold">Nhóm Chat Trực tuyến</CardTitle>
                  <Badge
                    variant="outline"
                    className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                      group.status === "active"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-muted-foreground/20 bg-muted text-muted-foreground"
                    }`}
                  >
                    {group.status === "active" ? "Đang hoạt động" : "Đã tạm dừng"}
                  </Badge>
                </div>
                <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                  Quản lý nhóm chat 5 thành viên, bật/tắt nhóm và xem liên kết cuộc trò chuyện.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="group-status"
                  checked={group.status === "active"}
                  onCheckedChange={handleToggleStatus}
                  disabled={togglingStatus}
                />
                <Label htmlFor="group-status" className="cursor-pointer text-xs font-medium">
                  Kích hoạt nhóm
                </Label>
              </div>

              {pwaGroupUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-xl border-border/60 bg-background/50 text-xs font-medium transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  <Link href={pwaGroupUrl} target="_blank" rel="noopener noreferrer">
                    Mở nhóm chat <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Members Section Card */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Thành viên nhóm</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Mời tối đa 5 người dùng tham gia vào cuộc trò chuyện riêng tư của bot
                </CardDescription>
              </div>
            </div>
            <span className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {members.length}/5 Thành viên
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-5 sm:p-6">
          <InviteMemberForm
            botId={botId}
            currentCount={members.length}
            onMemberInvited={(newMember) => setMembers((prev) => [...prev, newMember])}
          />
          <MemberList
            botId={botId}
            members={members}
            onMemberRemoved={(id) => setMembers((prev) => prev.filter((m) => m.id !== id))}
            onMemberUpdated={(updated) =>
              setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
            }
          />
        </CardContent>
      </Card>

      {/* Knowledge Section A & B Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Layer A Card: Group Notes & Knowledge */}
        <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base font-semibold">Ghi chú & Tri thức nhóm</CardTitle>
                  <CardDescription className="truncate text-xs text-muted-foreground">
                    Ghi chú tạo thủ công và tin nhắn được ghim vào tri thức bot
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <GroupNotesList botId={botId} />
          </CardContent>
        </Card>

        {/* Layer B Card */}
        <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base font-semibold">Tổng hợp hàng ngày</CardTitle>
                  <CardDescription className="truncate text-xs text-muted-foreground">
                    Bản tóm tắt tự động 24h qua định kỳ 02:00 AM
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <InsightsList botId={botId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
