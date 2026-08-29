import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Download, Upload, MoreHorizontal } from "lucide-react";
import { ReportTemplateItem } from "@/types";
import { MAX_WORKSPACE_REPORT_TEMPLATES } from "@/lib/constants";

interface TemplateHeaderProps {
  templates: ReportTemplateItem[];
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string) => void;
  isOwnerOrAdmin: boolean;
  isCreating: boolean;
  onOpenCreateDialog: () => void;
  onExportTemplate: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function TemplateHeader({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  isOwnerOrAdmin,
  isCreating,
  onOpenCreateDialog,
  onExportTemplate,
  onImportFile,
  fileInputRef,
}: TemplateHeaderProps) {
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Template switcher pills */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="mr-1 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Mẫu báo cáo ({templates.length}/{MAX_WORKSPACE_REPORT_TEMPLATES}):
            </span>
          </div>

          {templates.map((tmpl) => {
            const isSelected = tmpl.id === selectedTemplateId;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => onSelectTemplate(tmpl.id)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? "shadow-xs border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <span>{tmpl.name}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Create Button + 3-dots Dropdown Menu (Import/Export) */}
        {isOwnerOrAdmin && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={onImportFile}
            />

            <Button
              type="button"
              size="sm"
              disabled={templates.length >= MAX_WORKSPACE_REPORT_TEMPLATES || isCreating}
              onClick={onOpenCreateDialog}
              className="h-9 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Tạo mẫu mới
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-border/60 text-muted-foreground transition-all hover:border-border hover:bg-muted/50 hover:text-foreground"
                  title="Tùy chọn khác (Nhập / Xuất JSON)"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 rounded-2xl border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md"
              >
                <DropdownMenuItem
                  disabled={templates.length >= MAX_WORKSPACE_REPORT_TEMPLATES || isCreating}
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:text-foreground"
                >
                  <Upload className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary group-focus:text-primary" />
                  <span>Nhập JSON</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={!currentTemplate}
                  onClick={onExportTemplate}
                  className="group flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:text-foreground"
                >
                  <Download className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary group-focus:text-primary" />
                  <span>Xuất JSON</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
