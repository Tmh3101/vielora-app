import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, FileText, Loader2 } from "lucide-react";
import { ReportTemplateItem } from "@/types";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTemplateName: string;
  onNewTemplateNameChange: (val: string) => void;
  createMode: "blank" | "clone";
  onCreateModeChange: (mode: "blank" | "clone") => void;
  cloneFromTemplateId: string;
  onCloneFromTemplateIdChange: (id: string) => void;
  templates: ReportTemplateItem[];
  selectedTemplateId: string | null;
  isCreating: boolean;
  onSubmit: () => void;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  newTemplateName,
  onNewTemplateNameChange,
  createMode,
  onCreateModeChange,
  cloneFromTemplateId,
  onCloneFromTemplateIdChange,
  templates,
  selectedTemplateId,
  isCreating,
  onSubmit,
}: CreateTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border/60 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Tạo mẫu báo cáo mới</DialogTitle>
          <DialogDescription className="text-xs">
            Thiết lập tên mẫu và chọn phương thức khởi tạo (tạo từ đầu hoặc nhân bản từ mẫu có sẵn)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new_template_name" className="text-xs font-semibold">
              Tên mẫu báo cáo
            </Label>
            <Input
              id="new_template_name"
              value={newTemplateName}
              onChange={(e) => onNewTemplateNameChange(e.target.value)}
              placeholder="VD: Báo cáo Đánh giá Hoạt động AI"
              className="h-9 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Phương thức khởi tạo</Label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => onCreateModeChange("clone")}
                className={`cursor-pointer rounded-xl border p-3 transition-all ${
                  createMode === "clone"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold">
                    {templates.length > 0 ? "Tạo bản sao" : "Mẫu mặc định"}
                  </p>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {templates.length > 0
                    ? "Sao chép cấu trúc từ một mẫu báo cáo đang có trong workspace."
                    : "Khởi tạo các section chuẩn theo mẫu mặc định (Bot Summary Report)."}
                </p>
              </div>

              <div
                onClick={() => onCreateModeChange("blank")}
                className={`cursor-pointer rounded-xl border p-3 transition-all ${
                  createMode === "blank"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold">Tạo mới</p>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Bắt đầu với trang trắng để tự tay thêm từng section.
                </p>
              </div>
            </div>
          </div>

          {createMode === "clone" && templates.length > 0 && (
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3.5 transition-colors">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <Label className="text-xs font-semibold text-foreground">
                  Chọn mẫu nguồn để nhân bản
                </Label>
              </div>
              <Select
                value={cloneFromTemplateId || selectedTemplateId || templates[0]?.id}
                onValueChange={(val) => onCloneFromTemplateIdChange(val)}
              >
                <SelectTrigger className="h-9 rounded-xl border-border/60 bg-background text-xs font-medium transition-all hover:border-border hover:bg-muted/30 focus:bg-background focus:ring-1 focus:ring-primary/20">
                  <SelectValue placeholder="Chọn mẫu nguồn..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-2xl border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md">
                  {templates.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={t.id}
                      hideIndicator
                      className="group cursor-pointer rounded-xl px-3 py-2 text-xs transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground group-hover:text-primary group-focus:text-primary">
                            {t.name}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={isCreating || !newTemplateName.trim()}
            onClick={onSubmit}
            className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang khởi tạo...
              </>
            ) : (
              "Tạo mẫu báo cáo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
