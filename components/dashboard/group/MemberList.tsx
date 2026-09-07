"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GroupMemberRow } from "@/lib/services/group-chat.service";
import { updateMemberApi, removeMemberApi } from "@/lib/api/group-chat";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, StickyNote, FileDown, Check, Edit2, Loader2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MemberListProps {
  botId: string;
  members: GroupMemberRow[];
  onMemberRemoved: (memberId: string) => void;
  onMemberUpdated: (updatedMember: GroupMemberRow) => void;
}

export function MemberList({ botId, members, onMemberRemoved, onMemberUpdated }: MemberListProps) {
  const t = useTranslations("dashboard.group.memberList");
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleInput, setRoleInput] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleTogglePermission = async (member: GroupMemberRow, canManage: boolean) => {
    setActionLoadingId(member.id);
    try {
      const res = await updateMemberApi(botId, member.id, {
        can_create_note: canManage,
        can_pin_knowledge: canManage,
      });

      if (res.success && res.data) {
        onMemberUpdated({
          ...res.data,
          display_name: member.display_name,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
        });
        toast({
          title: t("updateSuccessTitle"),
          description: canManage
            ? t("noteGranted", { email: member.email })
            : t("noteRevoked", { email: member.email }),
        });
      } else {
        toast({
          title: t("updateFailedTitle"),
          description: res.message || t("updateFailedDesc"),
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Toggle note permission error:", err);
      toast({
        title: t("errorTitle"),
        description: t("connectionFailed"),
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleExportReport = async (member: GroupMemberRow, canExport: boolean) => {
    setActionLoadingId(member.id);
    try {
      const res = await updateMemberApi(botId, member.id, {
        can_export_report: canExport,
        canExportReport: canExport,
      });

      if (res.success && res.data) {
        onMemberUpdated({
          ...res.data,
          display_name: member.display_name,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
        });
        toast({
          title: t("updateSuccessTitle"),
          description: canExport
            ? t("exportGranted", { email: member.email })
            : t("exportRevoked", { email: member.email }),
        });
      } else {
        toast({
          title: t("updateFailedTitle"),
          description: res.message || t("updateFailedDesc"),
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Toggle export report permission error:", err);
      toast({
        title: t("errorTitle"),
        description: t("connectionFailed"),
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveRole = async (member: GroupMemberRow) => {
    setActionLoadingId(member.id);
    try {
      const finalRole = roleInput.trim() || null;
      const res = await updateMemberApi(botId, member.id, {
        role_label: finalRole,
      });

      if (res.success && res.data) {
        onMemberUpdated({
          ...res.data,
          display_name: member.display_name,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
        });
        setEditingId(null);
        toast({
          title: t("roleUpdatedTitle"),
          description: t("roleUpdatedDesc", {
            email: member.email,
            role: finalRole || t("fallbackRole"),
          }),
        });
      } else {
        toast({
          title: t("errorTitle"),
          description: res.message || t("roleUpdateFailed"),
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Save role error:", err);
      toast({
        title: t("errorTitle"),
        description: t("connectionFailed"),
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemove = async (member: GroupMemberRow) => {
    setActionLoadingId(member.id);
    try {
      const res = await removeMemberApi(botId, member.id);
      if (res.success) {
        onMemberRemoved(member.id);
        toast({
          title: t("memberRemovedTitle"),
          description: t("memberRemovedDesc", { email: member.email }),
        });
      } else {
        toast({
          title: t("errorTitle"),
          description: res.message || t("removeFailed"),
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Remove member error:", err);
      toast({
        title: t("errorTitle"),
        description: t("connectionFailed"),
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((m) => {
        const isLoading = actionLoadingId === m.id;
        const isEditingRole = editingId === m.id;

        return (
          <div
            key={m.id}
            className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-background/50 p-4 transition-all hover:border-border/60 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1.5">
              {/* Member Display Name & Email */}
              <div className="flex items-center gap-2">
                {m.display_name ? (
                  <span className="text-sm">
                    <strong className="font-semibold text-foreground">{m.display_name}</strong>{" "}
                    <span className="font-normal text-muted-foreground">({m.email})</span>
                  </span>
                ) : (
                  <span className="text-sm font-normal text-foreground">{m.email}</span>
                )}

                {Boolean(m.can_create_note || m.can_pin_knowledge) && (
                  <span className="inline-flex items-center rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400">
                    <StickyNote className="mr-1 h-3 w-3" />
                    {t("badgeNotePermission")}
                  </span>
                )}

                {Boolean(m.can_export_report || m.canExportReport) && (
                  <span className="inline-flex items-center rounded-md border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-400">
                    <FileDown className="mr-1 h-3 w-3" />
                    {t("badgeExportPermission")}
                  </span>
                )}
              </div>

              {/* Role & Joined Date */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {t("joinedAt", { date: new Date(m.joined_at).toLocaleDateString("vi-VN") })}
                </span>
                <span>•</span>
                {isEditingRole ? (
                  <div className="flex items-center gap-1">
                    <Input
                      autoFocus
                      size={1}
                      className="h-7 w-36 rounded-lg text-xs"
                      placeholder={t("rolePlaceholder")}
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRole(m);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shadow-xs h-7 w-7 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/25 hover:text-emerald-700 active:scale-95 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/35 dark:hover:text-emerald-300"
                      onClick={() => handleSaveRole(m)}
                      disabled={isLoading}
                      title={t("saveRole")}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shadow-xs h-7 w-7 rounded-xl border border-slate-200/80 bg-slate-100/80 text-slate-500 transition-all duration-200 hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-600 active:scale-95 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-rose-500/50 dark:hover:bg-rose-500/25 dark:hover:text-rose-400"
                      onClick={() => setEditingId(null)}
                      title={t("cancel")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(m.id);
                      setRoleInput(m.role_label || "");
                    }}
                    className="group inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/40 px-2 py-0.5 font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    title={t("editRoleTitle")}
                  >
                    <span>{t("roleLabel", { role: m.role_label || t("fallbackRole") })}</span>
                    <Edit2 className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
                  </button>
                )}
              </div>
            </div>

            {/* Actions: Toggle note permission, export report & delete */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id={`can-note-${m.id}`}
                  checked={Boolean(m.can_create_note || m.can_pin_knowledge)}
                  onCheckedChange={(val) => handleTogglePermission(m, val)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor={`can-note-${m.id}`}
                  className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("permissionNote")}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id={`can-export-${m.id}`}
                  checked={Boolean(m.can_export_report || m.canExportReport)}
                  onCheckedChange={(val) => handleToggleExportReport(m, val)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor={`can-export-${m.id}`}
                  className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("permissionExport")}
                </Label>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-xl border-border/60 text-muted-foreground transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-600 active:scale-95 dark:hover:border-red-500/50 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                    title={t("deleteMember")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("confirmDeleteDesc", { email: m.email })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">
                      {t("confirmCancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemove(m)}
                      className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("confirmRemove")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
