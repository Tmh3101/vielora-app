import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, Settings2, Sparkles, UserCheck, GraduationCap, ServerCog } from "lucide-react";
import { ELanguage } from "@/types";

interface TemplateGeneralSettingsProps {
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  promptDirective?: string;
  onPromptDirectiveChange?: (val: string) => void;
  templateLanguages: string[];
  onToggleTemplateLang: (lang: ELanguage, checked: boolean) => void;
  isOwnerOrAdmin: boolean;
}

const SUPPORTED_LANGUAGES = [
  {
    id: ELanguage.Vi,
    flag: "🇻🇳",
    name: "Tiếng Việt",
  },
  {
    id: ELanguage.En,
    flag: "🇬🇧",
    name: "English",
  },
  {
    id: ELanguage.Ar,
    flag: "🇸🇦",
    name: "العربية",
  },
] as const;

const PERSONA_PRESETS = [
  {
    icon: UserCheck,
    label: "Hồ sơ năng lực chuyên gia",
    directive:
      "Đóng vai trò Chuyên gia thẩm định năng lực & hướng nghiệp. Phân tích tài liệu để xây dựng hồ sơ năng lực chuyên môn, làm nổi bật kỹ năng kỹ thuật cốt lõi và các thành tựu nổi bật.",
  },
  {
    icon: GraduationCap,
    label: "Đánh giá tiến độ học viên",
    directive:
      "Đóng vai trò Cố vấn giáo dục & đào tạo. Đánh giá mức độ hoàn thành bài học, khả năng nắm bắt kiến thức và đề xuất giải pháp bồi dưỡng nâng cao.",
  },
  {
    icon: ServerCog,
    label: "Kiểm toán vận hành AI",
    directive:
      "Đóng vai trò Kỹ sư vận hành AI. Đánh giá độ phủ tri thức, chất lượng giải đáp và phát hiện các lỗ hổng thông tin cần bổ sung.",
  },
];

export function TemplateGeneralSettings({
  templateName,
  onTemplateNameChange,
  promptDirective = "",
  onPromptDirectiveChange,
  templateLanguages,
  onToggleTemplateLang,
  isOwnerOrAdmin,
}: TemplateGeneralSettingsProps) {
  return (
    <Card className="border border-border/50 bg-card/50 shadow-md backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Thông tin mẫu báo cáo</CardTitle>
              <CardDescription className="text-xs">
                Tùy chỉnh tên hiển thị, phong cách phân tích AI và ngôn ngữ hỗ trợ của mẫu báo cáo
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Name */}
        <div className="space-y-1.5">
          <Label htmlFor="template_name" className="text-xs font-semibold text-foreground">
            Tên hiển thị mẫu báo cáo
          </Label>
          <Input
            id="template_name"
            disabled={!isOwnerOrAdmin}
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            placeholder="VD: Báo cáo Đánh giá Hoạt động AI"
            className="h-9 rounded-xl border-border/60 bg-muted/30 text-xs focus-visible:ring-primary"
          />
        </div>

        {/* Prompt Directive (Persona) */}
        <div className="space-y-2 pt-0.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="prompt_directive"
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Định hướng phân tích của Mẫu báo cáo
            </Label>
            <span className="text-[10.5px] text-muted-foreground">Tùy chọn nâng cao</span>
          </div>

          <Textarea
            id="prompt_directive"
            disabled={!isOwnerOrAdmin}
            value={promptDirective}
            onChange={(e) => onPromptDirectiveChange?.(e.target.value)}
            rows={3}
            placeholder="Nhập vai trò và góc nhìn bạn muốn AI sử dụng khi phân tích báo cáo này (Ví dụ: Hãy đóng vai trò là Chuyên gia Đánh giá Năng lực...)"
            className="resize-none rounded-xl border-border/60 bg-muted/30 text-xs leading-relaxed transition-all focus-visible:ring-primary"
          />

          {/* Quick Presets */}
          {isOwnerOrAdmin && onPromptDirectiveChange && (
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[10px] font-medium text-muted-foreground">
                Gợi ý mẫu định hướng nhanh:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PERSONA_PRESETS.map((preset, idx) => {
                  const Icon = preset.icon;
                  const isSelected = promptDirective === preset.directive;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onPromptDirectiveChange(preset.directive)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all hover:border-primary/50 hover:bg-primary/5 ${
                        isSelected
                          ? "border-primary/60 bg-primary/10 text-primary ring-1 ring-primary/30"
                          : "border-border/50 bg-background/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3 text-primary" />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Supported Languages */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground">
              Ngôn ngữ xuất báo cáo hỗ trợ
            </Label>
            <span className="text-[10px] text-muted-foreground">
              Đã chọn {templateLanguages.length}/3
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isChecked = templateLanguages.includes(lang.id);
              const isOnlyOne = isChecked && templateLanguages.length === 1;

              return (
                <button
                  key={lang.id}
                  type="button"
                  disabled={!isOwnerOrAdmin || isOnlyOne}
                  onClick={() => {
                    if (!isOwnerOrAdmin || isOnlyOne) return;
                    onToggleTemplateLang(lang.id, !isChecked);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-all ${
                    isChecked
                      ? "shadow-xs border-primary/50 bg-primary/10 font-semibold text-primary ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 font-medium text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                  } ${
                    !isOwnerOrAdmin
                      ? "cursor-not-allowed opacity-60"
                      : isOnlyOne
                        ? "cursor-default"
                        : "cursor-pointer active:scale-95"
                  }`}
                  title={
                    isOnlyOne
                      ? "Mẫu báo cáo phải có ít nhất một ngôn ngữ"
                      : `Bấm để ${isChecked ? "bỏ chọn" : "kích hoạt"} ngôn ngữ ${lang.name}`
                  }
                >
                  <span className="select-none text-sm leading-none">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {isChecked && <Check className="h-3 w-3 stroke-[2.5] text-primary" />}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Khi xuất báo cáo, AI sẽ tự động biên dịch nội dung theo các ngôn ngữ được kích hoạt ở
            trên.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
