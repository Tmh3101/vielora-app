import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowUp, ArrowDown, Trash2, ChevronRight } from "lucide-react";
import { SectionType, TemplateSectionConfig } from "@/types";
import {
  SECTION_TYPE_METADATA,
  SECTION_ALLOWED_BINDS,
  AVAILABLE_BIND_KEYS,
  COMMON_I18N_KEYS,
  AVAILABLE_TABLE_COLUMNS,
} from "@/lib/constants";

interface SectionItemCardProps {
  sec: TemplateSectionConfig;
  index: number;
  totalSections: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onMoveSection: (direction: "up" | "down") => void;
  onRemoveSection: () => void;
  onUpdateSection: (updates: Partial<TemplateSectionConfig>) => void;
  isOwnerOrAdmin: boolean;
}

export function SectionItemCard({
  sec,
  index,
  totalSections,
  isExpanded,
  onToggleExpand,
  onMoveSection,
  onRemoveSection,
  onUpdateSection,
  isOwnerOrAdmin,
}: SectionItemCardProps) {
  const meta = SECTION_TYPE_METADATA[sec.type as SectionType] || SECTION_TYPE_METADATA.hero;
  const IconComponent = meta.icon;
  const isFirst = index === 0;
  const isLast = index === totalSections - 1;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const allowedBinds = SECTION_ALLOWED_BINDS[sec.type as SectionType] || [];
  const hasDynamicBinds = allowedBinds.length > 0 && sec.type !== "hero";

  const currentTitleLabel =
    COMMON_I18N_KEYS.find((k) => k.value === sec.titleI18n)?.label || sec.titleI18n;
  const currentBindLabel =
    allowedBinds.find((k) => k.value === sec.bind)?.label ||
    AVAILABLE_BIND_KEYS.find((k) => k.value === sec.bind)?.label;

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card transition-all hover:border-border">
      {/* Section Card Header & Quick Reorder Controls */}
      <div className="flex items-center justify-between gap-3 bg-muted/30 p-3">
        <div onClick={onToggleExpand} className="flex flex-1 cursor-pointer items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconComponent className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">{meta.label}</span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {currentBindLabel ? `Nguồn: ${currentBindLabel}` : meta.description}
            </p>
          </div>
        </div>

        {/* Actions: Move Up / Down / Delete / Expand */}
        <div className="flex items-center gap-1">
          {isOwnerOrAdmin && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isFirst}
                onClick={() => onMoveSection("up")}
                title="Di chuyển lên"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isLast}
                onClick={() => onMoveSection("down")}
                title="Di chuyển xuống"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={totalSections <= 1}
                onClick={() => setDeleteConfirmOpen(true)}
                title={
                  totalSections <= 1 ? "Mẫu báo cáo phải có ít nhất 1 section" : "Xóa section này"
                }
                className="h-7 w-7 rounded-lg text-destructive/70 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleExpand}
            title={isExpanded ? "Thu gọn cấu hình" : "Mở rộng cấu hình"}
            className="h-7 w-7 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-200 ${
                isExpanded ? "rotate-90 text-foreground" : ""
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Expandable Section Config Form */}
      {isExpanded && (
        <div className="space-y-4 border-t border-border/50 bg-background/60 p-4">
          {/* Section Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Loại Section</Label>
            <Select
              disabled={!isOwnerOrAdmin}
              value={sec.type}
              onValueChange={(val: SectionType) => {
                const newMeta = SECTION_TYPE_METADATA[val];
                const newAllowedBinds = SECTION_ALLOWED_BINDS[val] || [];
                const defaultBind = newAllowedBinds[0]?.value || newMeta?.defaultBind || sec.bind;
                const defaultTitle =
                  newAllowedBinds[0]?.defaultTitle || newMeta?.defaultTitleI18n || sec.titleI18n;
                onUpdateSection({
                  type: val,
                  bind: defaultBind,
                  titleI18n: defaultTitle,
                  chart:
                    val === "chart"
                      ? defaultBind === "topicTrends"
                        ? "line"
                        : "radar"
                      : undefined,
                });
              }}
            >
              <SelectTrigger className="h-8 rounded-xl border-border/60 bg-muted/30 text-xs transition-all hover:border-border hover:bg-muted/50 focus:bg-background focus:ring-1 focus:ring-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md">
                {(Object.keys(SECTION_TYPE_METADATA) as SectionType[]).map((st) => {
                  const typeMeta = SECTION_TYPE_METADATA[st];
                  const Icon = typeMeta.icon;
                  return (
                    <SelectItem
                      key={st}
                      value={st}
                      hideIndicator
                      className="group cursor-pointer rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-primary transition-transform duration-150 group-hover:scale-110" />
                        <span className="font-medium text-foreground group-hover:text-primary group-focus:text-primary">
                          {typeMeta.label}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Inputs for Configurable Sections */}
          {hasDynamicBinds && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-foreground">
                Nguồn dữ liệu kết nối
              </Label>
              <Select
                disabled={!isOwnerOrAdmin}
                value={sec.bind || allowedBinds[0]?.value || ""}
                onValueChange={(val) => {
                  const match = allowedBinds.find((b) => b.value === val);
                  const nextOptions = { ...sec.options };
                  if (sec.type === "table") {
                    const newCols =
                      (val && AVAILABLE_TABLE_COLUMNS[val]) || AVAILABLE_TABLE_COLUMNS.default;
                    nextOptions.columns = newCols.map((c) => c.key);
                  }
                  const nextChart =
                    sec.type === "chart"
                      ? val === "topicDistribution"
                        ? "bar"
                        : val === "topicTrends"
                          ? "line"
                          : "radar"
                      : sec.chart;

                  onUpdateSection({
                    bind: val,
                    titleI18n: match?.defaultTitle || sec.titleI18n,
                    options: nextOptions,
                    chart: nextChart,
                  });
                }}
              >
                <SelectTrigger className="h-8 w-full rounded-xl border-border/60 bg-muted/30 text-xs transition-all hover:border-border hover:bg-muted/50 focus:bg-background focus:ring-1 focus:ring-primary/20">
                  <SelectValue placeholder="Chọn nguồn dữ liệu..." />
                </SelectTrigger>
                <SelectContent className="max-h-56 rounded-2xl border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md">
                  {allowedBinds.map((bk) => (
                    <SelectItem
                      key={bk.value}
                      value={bk.value}
                      hideIndicator
                      className="cursor-pointer rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
                    >
                      {bk.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentTitleLabel && (
                <p className="text-[10.5px] text-muted-foreground">
                  Tiêu đề tự động:{" "}
                  <span className="font-semibold text-foreground">{currentTitleLabel}</span>
                </p>
              )}
            </div>
          )}

          {/* Additional Options for Table */}
          {sec.type === "table" &&
            (() => {
              const availableCols =
                (sec.bind && AVAILABLE_TABLE_COLUMNS[sec.bind]) || AVAILABLE_TABLE_COLUMNS.default;
              const rawColumns = (sec.options?.columns as string[]) || [];
              const validColumns = rawColumns.filter((colKey) =>
                availableCols.some((c) => c.key === colKey)
              );
              const currentColumns =
                validColumns.length > 0 ? validColumns : availableCols.map((c) => c.key);

              const handleToggleColumn = (colKey: string) => {
                if (!isOwnerOrAdmin) return;
                let next: string[];
                if (currentColumns.includes(colKey)) {
                  if (currentColumns.length <= 1) return;
                  next = currentColumns.filter((c) => c !== colKey);
                } else {
                  next = [...currentColumns, colKey];
                }
                onUpdateSection({
                  options: {
                    ...sec.options,
                    columns: next,
                  },
                });
              };

              return (
                <div className="space-y-2.5 rounded-xl border border-border/50 bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-foreground">
                      Cột hiển thị trong bảng
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      Đã chọn: {currentColumns.length}/{availableCols.length} cột
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availableCols.map((col) => {
                      const isSelected = currentColumns.includes(col.key);
                      return (
                        <button
                          key={col.key}
                          type="button"
                          disabled={!isOwnerOrAdmin}
                          onClick={() => handleToggleColumn(col.key)}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                            isSelected
                              ? "shadow-xs bg-primary text-primary-foreground ring-1 ring-primary/30"
                              : "border border-border/60 bg-background/80 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSelected ? "bg-white" : "bg-muted-foreground/40"
                            }`}
                          />
                          <span>{col.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Bấm vào các nút trên để bật hoặc tắt cột tương ứng xuất hiện trên bảng báo cáo.
                  </p>
                </div>
              );
            })()}
        </div>
      )}

      {/* Delete Section Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-2xl border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Xóa section &quot;{meta.label}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              Bạn có chắc chắn muốn xóa section &quot;{meta.label}&quot; ({sec.type}) khỏi mẫu báo
              cáo này không? Mọi thiết lập của section này sẽ bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 rounded-xl border-border/60 text-xs font-medium transition-colors hover:border-border hover:bg-muted hover:text-foreground">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRemoveSection();
                setDeleteConfirmOpen(false);
              }}
              className="shadow-xs h-9 rounded-xl bg-destructive px-4 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
            >
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
