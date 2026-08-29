import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutTemplate, Plus, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { SectionType, TemplateSectionConfig } from "@/types";
import { SECTION_TYPE_METADATA } from "@/lib/constants";
import { SectionItemCard } from "./SectionItemCard";

interface SectionListEditorProps {
  sections: TemplateSectionConfig[];
  expandedSections: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onMoveSection: (index: number, direction: "up" | "down") => void;
  onRemoveSection: (id: string) => void;
  onUpdateSection: (id: string, updates: Partial<TemplateSectionConfig>) => void;
  onAddSection: (type: SectionType) => void;
  onSaveTemplate: () => void;
  onOpenDeleteDialog: () => void;
  isSaving: boolean;
  isDeleting: boolean;
  totalTemplates: number;
  isOwnerOrAdmin: boolean;
}

export function SectionListEditor({
  sections,
  expandedSections,
  onToggleExpand,
  onMoveSection,
  onRemoveSection,
  onUpdateSection,
  onAddSection,
  onSaveTemplate,
  onOpenDeleteDialog,
  isSaving,
  isDeleting,
  totalTemplates,
  isOwnerOrAdmin,
}: SectionListEditorProps) {
  return (
    <div className="space-y-6">
      {/* Sections List & Order Card */}
      <Card className="border border-border/50 bg-card/50 shadow-md backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LayoutTemplate className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Cấu trúc các sections</CardTitle>
              </div>
            </div>

            {/* Add Section Action Dropdown */}
            {isOwnerOrAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl border-dashed border-primary/40 bg-primary/5 px-3 text-xs font-semibold text-primary transition-all hover:border-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Thêm section</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md"
                >
                  {(Object.keys(SECTION_TYPE_METADATA) as SectionType[]).map((st) => {
                    const meta = SECTION_TYPE_METADATA[st];
                    const IconComponent = meta.icon;
                    return (
                      <DropdownMenuItem
                        key={st}
                        onClick={() => onAddSection(st)}
                        className="group flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:text-foreground"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-focus:bg-primary group-focus:text-primary-foreground">
                          <IconComponent className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold text-foreground">{meta.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {sections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
              Chưa có section nào. Bấm &quot;Thêm section mới&quot; ở trên để bắt đầu thêm cấu trúc.
            </div>
          ) : (
            sections.map((sec, index) => (
              <SectionItemCard
                key={sec.id}
                sec={sec}
                index={index}
                totalSections={sections.length}
                isExpanded={!!expandedSections[sec.id]}
                onToggleExpand={() => onToggleExpand(sec.id)}
                onMoveSection={(dir) => onMoveSection(index, dir)}
                onRemoveSection={() => onRemoveSection(sec.id)}
                onUpdateSection={(updates) => onUpdateSection(sec.id, updates)}
                isOwnerOrAdmin={isOwnerOrAdmin}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Bottom Actions Bar */}
      {isOwnerOrAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting || totalTemplates <= 1}
            onClick={onOpenDeleteDialog}
            className="rounded-xl border-destructive/30 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            title={
              totalTemplates <= 1
                ? "Không thể xoá mẫu duy nhất của workspace"
                : "Vô hiệu hoá mẫu này"
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xoá mẫu này
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={isSaving || sections.length === 0}
              onClick={onSaveTemplate}
              className="rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
