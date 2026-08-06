"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/shared/DashboardSidebar";
import { DashboardMobileHeader } from "@/components/dashboard/shared/DashboardMobileHeader";
import { DashboardMobileNav } from "@/components/dashboard/shared/DashboardMobileNav";
import { PageHeader } from "@/components/dashboard/shared/PageHeader";
import { InviteMemberModal } from "@/components/dashboard/settings/InviteMemberModal";
import { ConfirmActionModal } from "@/components/dashboard/settings/ConfirmActionModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  UserPlus,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Trash2,
  UserX,
  Users,
} from "lucide-react";
import { EWorkspaceRole, EWorkspaceInviteStatus, EWorkspaceMemberStatus } from "@/types/enums";

interface Member {
  userId: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  joinedAt?: string;
}

interface Invitation {
  id: string;
  email: string;
  name?: string;
  role_id: string;
  status: string;
  created_at: string;
}

interface TableRowItem {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  isInvitation?: boolean;
}

export default function WorkspaceMembersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { signOut } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "revoke" | "remove" | null;
    targetId: string | null;
    targetName: string | null;
  }>({
    isOpen: false,
    type: null,
    targetId: null,
    targetName: null,
  });

  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members`);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Không thể tải danh sách thành viên");
    }
    const data = await res.json();
    setMembers(data.members || []);
  }, [activeWorkspace?.id]);

  const fetchInvitations = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invitations`);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Không thể tải danh sách lời mời");
    }
    const data = await res.json();
    setInvitations(data.invitations || []);
  }, [activeWorkspace?.id]);

  const loadData = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([fetchMembers(), fetchInvitations()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra khi tải dữ liệu";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace?.id, fetchMembers, fetchInvitations]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine if current user is owner of the workspace
  const currentUserRole = useMemo(() => {
    return members.find((m) => m.userId === user?.id)?.role || activeWorkspace?.role;
  }, [members, user?.id, activeWorkspace?.role]);

  const isOwner = useMemo(() => {
    return currentUserRole === EWorkspaceRole.Owner;
  }, [currentUserRole]);

  // Combine active members and pending invitations into one display list
  const combinedList = useMemo<TableRowItem[]>(() => {
    const list: TableRowItem[] = members.map((m) => ({
      id: m.userId || m.email,
      email: m.email,
      name: m.name,
      role: m.role,
      status: m.status || EWorkspaceMemberStatus.Active,
      isInvitation: false,
    }));

    const memberEmails = new Set(members.map((m) => m.email?.toLowerCase()));

    invitations.forEach((inv) => {
      if (!memberEmails.has(inv.email?.toLowerCase())) {
        list.push({
          id: inv.id,
          email: inv.email,
          name: inv.name,
          role: inv.role_id,
          status: EWorkspaceInviteStatus.Pending,
          isInvitation: true,
        });
      }
    });

    return list;
  }, [members, invitations]);

  const handleRevokeInvitation = async (inviteId: string) => {
    if (!activeWorkspace?.id) return;

    setActionLoadingId(inviteId);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invitations/${inviteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể hủy lời mời");

      toast.success("Đã hủy lời mời thành công");
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra khi hủy lời mời");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberEmail: string) => {
    if (!activeWorkspace?.id) return;

    setActionLoadingId(memberUserId);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members/${memberUserId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa thành viên");

      toast.success(`Đã xóa ${memberEmail} khỏi workspace`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra khi xóa thành viên");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRevokeConfirm = (inviteId: string, email: string) => {
    setConfirmModal({
      isOpen: true,
      type: "revoke",
      targetId: inviteId,
      targetName: email,
    });
  };

  const openRemoveConfirm = (userId: string, nameOrEmail: string) => {
    setConfirmModal({
      isOpen: true,
      type: "remove",
      targetId: userId,
      targetName: nameOrEmail,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case EWorkspaceRole.Owner:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Shield className="h-3.5 w-3.5" />
            Owner
          </span>
        );
      case EWorkspaceRole.Admin:
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === EWorkspaceMemberStatus.Active) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Đang hoạt động
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
        <Clock className="h-3.5 w-3.5" />
        {status === EWorkspaceInviteStatus.Pending ? "Đang chờ" : status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        fullName={user?.user_metadata?.full_name}
        email={user?.email}
        onSignOut={signOut}
      />

      <DashboardMobileHeader
        fullName={user?.user_metadata?.full_name}
        email={user?.email}
        onNavigateSettings={() => router.push("/dashboard/settings")}
        onSignOut={signOut}
      />

      <main className="lg:pl-64">
        <div className="container mx-auto space-y-8 px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          {/* Header Banner */}
          <PageHeader
            title="Thành viên Workspace"
            description={
              <>
                Quản lý danh sách thành viên và quyền truy cập không gian làm việc của{" "}
                <span className="font-semibold text-foreground">{activeWorkspace?.name}</span>
              </>
            }
          >
            {activeWorkspace && isOwner && (
              <Button
                onClick={() => setIsInviteOpen(true)}
                className="bg-primary font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Mời thành viên
              </Button>
            )}
          </PageHeader>

          {isLoading ? (
            <Card className="border border-border/50 bg-card/50 p-12 text-center shadow-md backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  Đang tải danh sách thành viên...
                </p>
              </div>
            </Card>
          ) : error ? (
            <Card className="border border-destructive/30 bg-destructive/10 p-6 text-center shadow-md">
              <div className="flex flex-col items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-6 w-6" />
                <p className="text-sm font-medium">{error}</p>
                <Button variant="outline" size="sm" onClick={loadData} className="mt-2 text-xs">
                  Thử lại
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border border-border/50 bg-card/50 shadow-md backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border/50 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4">Thành viên</th>
                        <th className="px-6 py-4">Vai trò</th>
                        <th className="px-6 py-4">Trạng thái</th>
                        {isOwner && <th className="px-6 py-4 text-right">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {combinedList.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isOwner ? 4 : 3}
                            className="px-6 py-8 text-center text-xs text-muted-foreground"
                          >
                            <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                            Chưa có thành viên nào.
                          </td>
                        </tr>
                      ) : (
                        combinedList.map((item) => {
                          return (
                            <tr key={item.id} className="transition-colors hover:bg-muted/20">
                              <td className="px-6 py-4">
                                <div>
                                  {item.name ? (
                                    <>
                                      <p className="font-semibold text-foreground">{item.name}</p>
                                      <p className="text-xs text-muted-foreground">{item.email}</p>
                                    </>
                                  ) : (
                                    <p className="font-semibold text-foreground">{item.email}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">{getRoleBadge(item.role)}</td>
                              <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                              {isOwner && (
                                <td className="px-6 py-4 text-right">
                                  {item.isInvitation ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={actionLoadingId === item.id}
                                      onClick={() => openRevokeConfirm(item.id, item.email)}
                                      className="hover:shadow-xs h-8 cursor-pointer rounded-xl border border-border/60 bg-transparent text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                                    >
                                      {actionLoadingId === item.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <>
                                          <UserX className="mr-1.5 h-3.5 w-3.5" />
                                          Hủy lời mời
                                        </>
                                      )}
                                    </Button>
                                  ) : item.id === user?.id ? (
                                    <span className="text-xs font-medium text-muted-foreground">
                                      (Bạn)
                                    </span>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={actionLoadingId === item.id}
                                      onClick={() =>
                                        openRemoveConfirm(item.id, item.name || item.email)
                                      }
                                      className="hover:shadow-xs h-8 cursor-pointer rounded-xl border border-border/60 bg-transparent text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                                    >
                                      {actionLoadingId === item.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <>
                                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                          Xóa
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {activeWorkspace && (
        <InviteMemberModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          workspaceId={activeWorkspace.id}
          onSuccess={() => {
            fetchMembers();
            fetchInvitations();
          }}
        />
      )}

      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, type: null, targetId: null, targetName: null })
        }
        onConfirm={async () => {
          if (!confirmModal.targetId) return;
          if (confirmModal.type === "revoke") {
            await handleRevokeInvitation(confirmModal.targetId);
          } else if (confirmModal.type === "remove") {
            await handleRemoveMember(confirmModal.targetId, confirmModal.targetName || "");
          }
          setConfirmModal({ isOpen: false, type: null, targetId: null, targetName: null });
        }}
        isLoading={actionLoadingId !== null}
        title={
          confirmModal.type === "revoke"
            ? "Hủy lời mời tham gia?"
            : "Xóa thành viên khỏi Workspace?"
        }
        description={
          confirmModal.type === "revoke"
            ? `Bạn có chắc chắn muốn hủy lời mời tham gia gửi đến ${confirmModal.targetName}? Lời mời sẽ không còn hiệu lực.`
            : `Bạn có chắc chắn muốn xóa ${confirmModal.targetName} khỏi workspace? Người dùng này sẽ mất toàn bộ quyền truy cập vào các bot và tài nguyên.`
        }
        confirmText={confirmModal.type === "revoke" ? "Hủy lời mời" : "Xóa thành viên"}
        cancelText="Bỏ qua"
        variant="destructive"
        icon={
          confirmModal.type === "revoke" ? (
            <UserX className="h-5 w-5" />
          ) : (
            <Trash2 className="h-5 w-5" />
          )
        }
      />
      <DashboardMobileNav />
    </div>
  );
}
