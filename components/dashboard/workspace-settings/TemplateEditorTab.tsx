"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ShieldAlert, LayoutTemplate, Plus, Upload } from "lucide-react";

import type {
  SectionType,
  TemplateSectionConfig,
  ReportTemplateItem,
  TemplateEditorTabProps,
} from "@/types";
import { ELanguage } from "@/types";
import type { WorkspaceBranding } from "@/lib/reports/branding-provider";
import {
  DEFAULT_STARTER_SECTIONS,
  MAX_WORKSPACE_REPORT_TEMPLATES,
  SECTION_TYPE_METADATA,
} from "@/lib/constants";
import { DEFAULT_REPORT_TEMPLATE_KEY } from "@/config/report";
import {
  TemplateHeader,
  TemplateGeneralSettings,
  SectionListEditor,
  TemplateOutlinePreview,
  CreateTemplateDialog,
  DeleteTemplateDialog,
} from "./templates";

export type { TemplateEditorTabProps, ReportTemplateItem, TemplateSectionConfig, SectionType };

export function TemplateEditorTab({ workspaceId, isOwnerOrAdmin }: TemplateEditorTabProps) {
  const [templates, setTemplates] = useState<ReportTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [templateName, setTemplateName] = useState<string>("");
  const [promptDirective, setPromptDirective] = useState<string>("");
  const [templateLanguages, setTemplateLanguages] = useState<string[]>(["vi"]);
  const [sections, setSections] = useState<TemplateSectionConfig[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [branding, setBranding] = useState<WorkspaceBranding | null>(null);

  // Fetch workspace branding for live preview
  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspaces/${workspaceId}/branding`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const d = json.data;
          setBranding({
            workspaceId,
            brandName: d.brand_name || null,
            logoUrl: d.logo_url || null,
            primaryColor: d.primary_color || "#3B82F6",
            secondaryColor: d.secondary_color || null,
            fontFamily: d.font_family || "Inter, sans-serif",
            headerText: d.header_text || null,
            footerText: d.footer_text || null,
            watermarkUrl: d.watermark_url || null,
            defaultLanguage: d.default_language || "vi",
            supportedLanguages: d.supported_languages || ["vi"],
          });
        }
      })
      .catch((err) => console.error("Error loading branding in template tab:", err));
  }, [workspaceId]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // New Template form state
  const [newTemplateName, setNewTemplateName] = useState("");
  const [createMode, setCreateMode] = useState<"blank" | "clone">("clone");
  const [cloneFromTemplateId, setCloneFromTemplateId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current active template
  const currentTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0] || null;

  // Load templates from API
  const fetchTemplates = useCallback(
    async (preferTemplateId?: string) => {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/templates`);
        if (!res.ok) {
          throw new Error("Không thể tải danh sách mẫu báo cáo");
        }
        const json = await res.json();
        const list: ReportTemplateItem[] = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.data?.items)
            ? json.data.items
            : [];
        setTemplates(list);

        if (list.length > 0) {
          const target = preferTemplateId
            ? list.find((t) => t.id === preferTemplateId) || list[0]
            : list.find((t) => t.id === selectedTemplateId) || list[0];

          setSelectedTemplateId(target.id);
          setTemplateName(target.name);
          setPromptDirective(
            target.prompt_directive || (target.schema?.prompt_directive as string) || ""
          );
          setTemplateLanguages(
            Array.isArray(target.languages) && target.languages.length > 0
              ? target.languages
              : ["vi"]
          );

          const rawSections = target.schema?.sections;
          if (Array.isArray(rawSections) && rawSections.length > 0) {
            setSections(rawSections);
            const exp: Record<string, boolean> = {};
            rawSections.slice(0, 2).forEach((s) => {
              exp[s.id] = true;
            });
            setExpandedSections(exp);
          } else {
            setSections(DEFAULT_STARTER_SECTIONS);
          }
        } else {
          setSelectedTemplateId(null);
          setTemplateName("");
          setPromptDirective("");
          setSections([]);
        }
      } catch (err) {
        console.error("Fetch templates error:", err);
        toast.error("Lỗi khi tải mẫu báo cáo");
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, selectedTemplateId]
  );

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Handle switching between templates in the workspace
  const handleSelectTemplate = (templateId: string) => {
    const target = templates.find((t) => t.id === templateId);
    if (!target) return;

    setSelectedTemplateId(target.id);
    setTemplateName(target.name);
    setPromptDirective(
      target.prompt_directive || (target.schema?.prompt_directive as string) || ""
    );
    setTemplateLanguages(
      Array.isArray(target.languages) && target.languages.length > 0 ? target.languages : ["vi"]
    );

    const rawSections = target.schema?.sections;
    if (Array.isArray(rawSections) && rawSections.length > 0) {
      setSections(rawSections);
      const exp: Record<string, boolean> = {};
      rawSections.slice(0, 2).forEach((s) => {
        exp[s.id] = true;
      });
      setExpandedSections(exp);
    } else {
      setSections(DEFAULT_STARTER_SECTIONS);
    }
  };

  // Section reordering and management
  const handleToggleExpand = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    if (!isOwnerOrAdmin) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newSections = [...sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);
    setSections(newSections);
  };

  const handleRemoveSection = (sectionId: string) => {
    if (!isOwnerOrAdmin) return;
    if (sections.length <= 1) {
      toast.error("Mẫu báo cáo phải có ít nhất 1 section");
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<TemplateSectionConfig>) => {
    if (!isOwnerOrAdmin) return;
    setSections((prev) => prev.map((sec) => (sec.id === sectionId ? { ...sec, ...updates } : sec)));
  };

  const handleAddSection = (type: SectionType) => {
    if (!isOwnerOrAdmin) return;
    const meta = SECTION_TYPE_METADATA[type];
    const newId = `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newSec: TemplateSectionConfig = {
      id: newId,
      type,
      bind: meta?.defaultBind,
      titleI18n: meta?.defaultTitleI18n,
      showBranding: type === "hero" || type === "footer",
      options:
        type === "chart"
          ? { chart: "line", colorFromBranding: true }
          : type === "table"
            ? { columns: ["period", "subject", "score", "delta"] }
            : undefined,
    };

    setSections((prev) => [...prev, newSec]);
    setExpandedSections((prev) => ({ ...prev, [newId]: true }));
    toast.success(`Đã thêm section "${meta?.label || type}"`);
  };

  // Save current template schema (In-place update)
  const handleSaveTemplate = async () => {
    if (!isOwnerOrAdmin || !selectedTemplateId) {
      toast.error("Bạn không có quyền cập nhật mẫu báo cáo này");
      return;
    }

    if (!templateName.trim()) {
      toast.error("Vui lòng nhập tên mẫu báo cáo");
      return;
    }

    if (sections.length === 0) {
      toast.error("Mẫu báo cáo phải chứa ít nhất 1 section");
      return;
    }

    setIsSaving(true);
    try {
      const updatedSchema = {
        title: templateName.trim(),
        description: currentTemplate?.schema?.description || "",
        prompt_directive: promptDirective.trim() || null,
        sections,
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/templates/${selectedTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          languages: templateLanguages,
          prompt_directive: promptDirective.trim() || null,
          schema: updatedSchema,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Lỗi khi lưu cấu hình mẫu báo cáo");
      }

      toast.success("Đã cập nhật cấu hình mẫu báo cáo thành công!");
      await fetchTemplates(selectedTemplateId);
    } catch (err) {
      console.error("Save template error:", err);
      toast.error(err instanceof Error ? err.message : "Lỗi khi lưu mẫu báo cáo");
    } finally {
      setIsSaving(false);
    }
  };

  // Language toggle for current template
  const handleToggleTemplateLang = (lang: ELanguage, checked: boolean) => {
    setTemplateLanguages((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, lang]));
      }
      const filtered = prev.filter((l) => l !== lang);
      return filtered.length > 0 ? filtered : ["vi"];
    });
  };

  // Create new template (from scratch or clone from existing template)
  const handleCreateTemplate = async () => {
    if (!isOwnerOrAdmin) return;
    if (!newTemplateName.trim()) {
      toast.error("Vui lòng nhập tên mẫu báo cáo mới");
      return;
    }

    if (templates.length >= MAX_WORKSPACE_REPORT_TEMPLATES) {
      toast.error(
        `Không gian làm việc đã đạt tối đa ${MAX_WORKSPACE_REPORT_TEMPLATES} mẫu báo cáo.`
      );
      return;
    }

    setIsCreating(true);
    try {
      const sourceTemplate =
        createMode === "clone"
          ? templates.find((t) => t.id === cloneFromTemplateId) || currentTemplate || templates[0]
          : null;

      let starterSections: TemplateSectionConfig[];
      if (createMode === "blank") {
        starterSections = [
          {
            id: `sec-${Date.now().toString(36)}-hero`,
            type: "hero",
            bind: "botIdentity",
            showBranding: true,
          },
        ];
      } else {
        const raw = sourceTemplate?.schema?.sections;
        starterSections =
          Array.isArray(raw) && raw.length > 0
            ? JSON.parse(JSON.stringify(raw))
            : DEFAULT_STARTER_SECTIONS;
      }

      const initialSchema = {
        title: newTemplateName.trim(),
        description: "Mẫu báo cáo tùy chỉnh của workspace",
        sections: starterSections,
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: DEFAULT_REPORT_TEMPLATE_KEY,
          name: newTemplateName.trim(),
          languages:
            createMode === "clone" && sourceTemplate?.languages?.length
              ? sourceTemplate.languages
              : ["vi"],
          schema: initialSchema,
          is_active: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Lỗi khi tạo mẫu báo cáo");
      }

      toast.success(`Đã tạo mẫu báo cáo "${newTemplateName.trim()}" thành công!`);
      setCreateDialogOpen(false);
      setNewTemplateName("");
      await fetchTemplates(json.data?.id);
    } catch (err) {
      console.error("Create template error:", err);
      toast.error(err instanceof Error ? err.message : "Không thể tạo mẫu báo cáo");
    } finally {
      setIsCreating(false);
    }
  };

  // Export current template as JSON
  const handleExportTemplate = () => {
    if (!currentTemplate) return;
    const exportData = {
      vielora_report_template: "1.0",
      name: templateName,
      key: currentTemplate.key,
      languages: templateLanguages,
      schema: {
        title: templateName,
        description: currentTemplate.schema?.description || "",
        sections,
      },
    };

    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const safeName =
      templateName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "report";

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `template_${safeName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    toast.success(`Đã xuất file cấu hình mẫu "${templateName}" thành công!`);
  };

  // Import template from JSON
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (templates.length >= MAX_WORKSPACE_REPORT_TEMPLATES) {
      toast.error(
        `Không gian làm việc đã đạt giới hạn ${MAX_WORKSPACE_REPORT_TEMPLATES} mẫu báo cáo. Vui lòng xoá bớt mẫu trước khi nhập thêm.`
      );
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || typeof parsed !== "object") {
        throw new Error("File JSON không hợp lệ");
      }

      if (!parsed.name || typeof parsed.name !== "string") {
        throw new Error("File thiếu trường 'name' (Tên mẫu báo cáo)");
      }

      const targetKey = parsed.key || DEFAULT_REPORT_TEMPLATE_KEY;
      const rawSections = parsed.schema?.sections;
      if (!Array.isArray(rawSections) || rawSections.length === 0) {
        throw new Error("File JSON phải chứa ít nhất 1 section trong schema.sections");
      }

      setIsCreating(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: targetKey,
          name: parsed.name.trim(),
          languages:
            Array.isArray(parsed.languages) && parsed.languages.length > 0
              ? parsed.languages
              : ["vi"],
          schema: {
            title: parsed.name.trim(),
            description: parsed.schema?.description || "Mẫu báo cáo nhập từ file JSON",
            sections: rawSections,
          },
          is_active: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Lỗi khi nhập mẫu báo cáo");
      }

      toast.success(`Đã nhập mẫu báo cáo "${parsed.name}" thành công!`);
      await fetchTemplates(json.data?.id);
    } catch (err) {
      console.error("Import template error:", err);
      toast.error(err instanceof Error ? err.message : "Lỗi khi nhập file JSON");
    } finally {
      setIsCreating(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Delete / Deactivate template
  const handleDeleteTemplate = async () => {
    if (!isOwnerOrAdmin || !selectedTemplateId) return;

    if (templates.length <= 1) {
      toast.error("Không thể xoá mẫu báo cáo cuối cùng của không gian làm việc.");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/templates/${selectedTemplateId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể xoá mẫu báo cáo");
      }

      toast.success("Đã vô hiệu hoá mẫu báo cáo thành công");
      setDeleteDialogOpen(false);
      await fetchTemplates();
    } catch (err) {
      console.error("Delete template error:", err);
      toast.error(err instanceof Error ? err.message : "Lỗi khi xoá mẫu báo cáo");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-border/50 bg-card/50 p-12 text-center shadow-md backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Đang tải cấu hình mẫu báo cáo...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Read-only notification banner */}
      {!isOwnerOrAdmin && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <p className="text-xs font-medium">
            Bạn đang xem cấu hình ở chế độ chỉ đọc. Chỉ Chủ sở hữu hoặc Quản trị viên workspace mới
            có quyền tùy biến các section và lưu thay đổi mẫu báo cáo.
          </p>
        </div>
      )}

      {/* Empty State when no templates exist */}
      {templates.length === 0 ? (
        <Card className="shadow-xs border border-dashed border-border/80 bg-card/40 p-12 text-center backdrop-blur-sm">
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LayoutTemplate className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">Chưa có mẫu báo cáo nào</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Không gian làm việc này hiện chưa có mẫu báo cáo nào đang hoạt động. Hãy tạo mẫu báo
                cáo mới từ mẫu mặc định hoặc nhập cấu hình từ file JSON.
              </p>
            </div>
            {isOwnerOrAdmin && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCreating}
                  className="h-9 rounded-xl text-xs font-medium"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Nhập JSON
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setNewTemplateName("Bot Summary Report");
                    setCreateMode("clone");
                    setCloneFromTemplateId("");
                    setCreateDialogOpen(true);
                  }}
                  disabled={isCreating}
                  className="h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Tạo mẫu báo cáo mới
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Top Header & Template Selector Bar */}
          <TemplateHeader
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={handleSelectTemplate}
            isOwnerOrAdmin={isOwnerOrAdmin}
            isCreating={isCreating}
            onOpenCreateDialog={() => {
              setNewTemplateName("");
              setCreateMode("clone");
              setCloneFromTemplateId(selectedTemplateId || templates[0]?.id || "");
              setCreateDialogOpen(true);
            }}
            onExportTemplate={handleExportTemplate}
            onImportFile={handleImportFile}
            fileInputRef={fileInputRef}
          />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Column: General Settings & Schema Sections Editor */}
            <div className="space-y-6 lg:col-span-7">
              <TemplateGeneralSettings
                templateName={templateName}
                onTemplateNameChange={setTemplateName}
                promptDirective={promptDirective}
                onPromptDirectiveChange={setPromptDirective}
                templateLanguages={templateLanguages}
                onToggleTemplateLang={handleToggleTemplateLang}
                isOwnerOrAdmin={isOwnerOrAdmin}
              />

              <SectionListEditor
                sections={sections}
                expandedSections={expandedSections}
                onToggleExpand={handleToggleExpand}
                onMoveSection={handleMoveSection}
                onRemoveSection={handleRemoveSection}
                onUpdateSection={handleUpdateSection}
                onAddSection={handleAddSection}
                onSaveTemplate={handleSaveTemplate}
                onOpenDeleteDialog={() => setDeleteDialogOpen(true)}
                isSaving={isSaving}
                isDeleting={isDeleting}
                totalTemplates={templates.length}
                isOwnerOrAdmin={isOwnerOrAdmin}
              />
            </div>

            {/* Right Column: Visual Outline Preview Panel */}
            <div className="lg:col-span-5">
              <TemplateOutlinePreview
                templateName={templateName}
                sections={sections}
                branding={branding}
              />
            </div>
          </div>
        </>
      )}

      {/* Dialog: Create New Template */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        newTemplateName={newTemplateName}
        onNewTemplateNameChange={setNewTemplateName}
        createMode={createMode}
        onCreateModeChange={setCreateMode}
        cloneFromTemplateId={cloneFromTemplateId}
        onCloneFromTemplateIdChange={setCloneFromTemplateId}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        isCreating={isCreating}
        onSubmit={handleCreateTemplate}
      />

      {/* Alert Dialog: Soft Delete Confirmation */}
      <DeleteTemplateDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        templateName={currentTemplate?.name || ""}
        isDeleting={isDeleting}
        onConfirm={handleDeleteTemplate}
      />
    </div>
  );
}
