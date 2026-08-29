"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  Palette,
  FileText,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Camera,
  X,
} from "lucide-react";
import { ReportDocumentPreview } from "./templates";
import { ALLOWED_LOGO_MIME_TYPES, MAX_LOGO_SIZE } from "@/config/storage";
import { ELanguage } from "@/types";

export interface BrandingTabProps {
  workspaceId: string;
  isOwnerOrAdmin: boolean;
}

interface BrandingFormState {
  brand_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  header_text: string;
  footer_text: string;
  watermark_url: string;
  default_language: ELanguage;
  supported_languages: ELanguage[];
}

const DEFAULT_BRANDING: BrandingFormState = {
  brand_name: "",
  logo_url: "",
  primary_color: "#3B82F6",
  secondary_color: "",
  font_family: "Inter, sans-serif",
  header_text: "",
  footer_text: "",
  watermark_url: "",
  default_language: ELanguage.Vi,
  supported_languages: [ELanguage.Vi],
};

const FONT_FAMILY_OPTIONS = [
  {
    value: "Inter, sans-serif",
    label: "Inter — Hiện đại, rõ ràng, tiêu chuẩn",
  },
  {
    value: '"Be Vietnam Pro", sans-serif',
    label: "Be Vietnam Pro — Tối ưu hóa tiếng Việt",
  },
  {
    value: "Roboto, sans-serif",
    label: "Roboto — Chuẩn mực doanh nghiệp",
  },
  {
    value: "Outfit, sans-serif",
    label: "Outfit — Trẻ trung, phong cách công nghệ",
  },
  {
    value: '"Plus Jakarta Sans", sans-serif',
    label: "Plus Jakarta Sans — Hình học cao cấp",
  },
  {
    value: '"Noto Sans", "Noto Naskh Arabic", sans-serif',
    label: "Noto Sans — Đa ngôn ngữ & Ả Rập (RTL)",
  },
  {
    value: "Merriweather, serif",
    label: "Merriweather — Có chân (Serif) trang trọng",
  },
] as const;

export function BrandingTab({ workspaceId, isOwnerOrAdmin }: BrandingTabProps) {
  const [formData, setFormData] = useState<BrandingFormState>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  // Fetch current branding on mount or workspace change
  const fetchBranding = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/branding`);
      if (!res.ok) {
        throw new Error("Không thể tải thông tin thương hiệu workspace");
      }
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setFormData({
          brand_name: d.brand_name || "",
          logo_url: d.logo_url || "",
          primary_color: d.primary_color || "#3B82F6",
          secondary_color: d.secondary_color || "",
          font_family: d.font_family || "Inter, sans-serif",
          header_text: d.header_text || "",
          footer_text: d.footer_text || "",
          watermark_url: d.watermark_url || "",
          default_language: (d.default_language as ELanguage) || ELanguage.Vi,
          supported_languages:
            Array.isArray(d.supported_languages) && d.supported_languages.length > 0
              ? (d.supported_languages as ELanguage[])
              : [ELanguage.Vi],
        });
        if (d.logo_url) {
          setLogoPreviewUrl(d.logo_url);
        }
      } else {
        // Fallback to default
        setFormData(DEFAULT_BRANDING);
        setLogoPreviewUrl(null);
      }
    } catch (err) {
      console.error("fetchBranding error:", err);
      toast.error(err instanceof Error ? err.message : "Lỗi khi tải cấu hình branding");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Handle Logo Upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!(ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Định dạng file không hỗ trợ. Vui lòng chọn ảnh JPEG, PNG, WEBP hoặc SVG.");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    // Validate size (2MB)
    if (file.size > MAX_LOGO_SIZE) {
      toast.error("Kích thước file vượt quá giới hạn 2MB.");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setIsUploadingLogo(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch(`/api/workspaces/${workspaceId}/branding/upload`, {
        method: "POST",
        body: uploadData,
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.url) {
        throw new Error(json.message || json.error || "Tải lên logo thất bại");
      }

      // Append timestamp to break browser image cache on preview
      const cacheBustedUrl = `${json.url}?t=${Date.now()}`;
      setFormData((prev) => ({ ...prev, logo_url: json.url }));
      setLogoPreviewUrl(cacheBustedUrl);
      toast.success("Tải lên logo thành công");
    } catch (err) {
      console.error("Logo upload error:", err);
      toast.error(err instanceof Error ? err.message : "Tải lên logo thất bại");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo_url: "" }));
    setLogoPreviewUrl(null);
  };

  // Save branding configuration
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerOrAdmin) {
      toast.error("Chỉ chủ sở hữu hoặc quản trị viên mới có quyền cập nhật cấu hình thương hiệu.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể lưu cấu hình branding");
      }

      toast.success("Đã cập nhật cấu hình thương hiệu thành công!");
    } catch (err) {
      console.error("Save branding error:", err);
      toast.error(err instanceof Error ? err.message : "Lỗi khi lưu cấu hình thương hiệu");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-border/50 bg-card/50 p-12 text-center shadow-md backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Đang tải cấu hình thương hiệu...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {!isOwnerOrAdmin && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <p className="text-xs font-medium">
            Bạn đang xem cấu hình ở chế độ chỉ đọc. Chỉ Chủ sở hữu hoặc Quản trị viên workspace (vai
            trò cấp cao) mới có quyền chỉnh sửa và lưu cài đặt này.
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Settings Column */}
          <div className="space-y-6 lg:col-span-7">
            {/* 1. Identity & Logo Card */}
            <Card className="border border-border/50 bg-card/50 shadow-md backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Nhận diện thương hiệu</CardTitle>
                    <CardDescription className="text-xs">
                      Tên thương hiệu và logo chính thức xuất hiện trên báo cáo xuất PDF
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="brand_name" className="text-xs font-semibold text-foreground">
                    Tên thương hiệu
                  </Label>
                  <Input
                    id="brand_name"
                    disabled={!isOwnerOrAdmin}
                    value={formData.brand_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, brand_name: e.target.value }))
                    }
                    placeholder="VD: Vielora"
                    className="h-9 rounded-xl border-border/60 bg-muted/30 text-xs focus-visible:ring-primary"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Tên tổ chức / doanh nghiệp hiển thị ở tiêu đề trang và bìa báo cáo.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-foreground">Logo Workspace</Label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoFileChange}
                      disabled={!isOwnerOrAdmin || isUploadingLogo}
                    />

                    {/* Integrated Interactive Logo Box */}
                    <div
                      onClick={() => {
                        if (!isUploadingLogo && isOwnerOrAdmin) {
                          logoInputRef.current?.click();
                        }
                      }}
                      className={`group relative flex h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
                        isOwnerOrAdmin
                          ? "hover:shadow-xs cursor-pointer hover:border-primary hover:bg-muted/40"
                          : "cursor-not-allowed opacity-80"
                      } ${
                        logoPreviewUrl ? "border-border/70 bg-card" : "border-border/80 bg-muted/20"
                      }`}
                    >
                      {logoPreviewUrl ? (
                        <>
                          <div className="relative h-full w-full p-2.5">
                            <Image
                              src={logoPreviewUrl}
                              alt="Logo preview"
                              fill
                              unoptimized
                              className="object-contain"
                            />
                          </div>

                          {/* Hover Overlay */}
                          {isOwnerOrAdmin && !isUploadingLogo && (
                            <div className="backdrop-blur-xs absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              <Camera className="mb-1 h-5 w-5 text-white" />
                              <span className="text-[10px] font-medium text-white">
                                Thay đổi logo
                              </span>
                            </div>
                          )}

                          {/* Top-right Remove Button */}
                          {isOwnerOrAdmin && !isUploadingLogo && (
                            <button
                              type="button"
                              title="Xóa logo"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveLogo();
                              }}
                              className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition-all hover:scale-105 hover:bg-destructive/90 active:scale-95"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 text-center transition-transform duration-200 group-hover:scale-105">
                          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Upload className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-semibold text-foreground group-hover:text-primary">
                            Tải lên logo
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Bấm để chọn file
                          </span>
                        </div>
                      )}

                      {/* Loading State Spinner */}
                      {isUploadingLogo && (
                        <div className="backdrop-blur-xs absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85">
                          <Loader2 className="mb-1 h-6 w-6 animate-spin text-primary" />
                          <span className="text-[10px] font-medium text-muted-foreground">
                            Đang tải lên...
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Quy cách hình ảnh khuyên dùng:</p>
                      <p className="text-[11px] leading-relaxed">
                        • Định dạng:{" "}
                        <span className="font-medium text-foreground">PNG, JPEG, WEBP, SVG</span>{" "}
                        (tối đa 2MB).
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        • Logo nền trong suốt hiển thị đẹp nhất trên báo cáo PDF và các mẫu giao
                        diện.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Color Palette & Typography Card */}
            <Card className="border border-border/50 bg-card/50 shadow-md backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Palette className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Màu sắc & Phông chữ</CardTitle>
                    <CardDescription className="text-xs">
                      Tông màu chủ đạo và kiểu chữ thương hiệu áp dụng cho biểu đồ & văn bản
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Colors row: Primary & Secondary */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Primary Color */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="primary_color"
                      className="text-xs font-semibold text-foreground"
                    >
                      Màu chủ đạo <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <div className="shadow-xs relative flex h-9 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60">
                        <input
                          id="primary_color_picker"
                          type="color"
                          disabled={!isOwnerOrAdmin}
                          value={formData.primary_color || "#3B82F6"}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, primary_color: e.target.value }))
                          }
                          className="h-12 w-12 cursor-pointer border-0 p-0"
                        />
                      </div>
                      <Input
                        id="primary_color"
                        disabled={!isOwnerOrAdmin}
                        value={formData.primary_color}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, primary_color: e.target.value }))
                        }
                        placeholder="#3B82F6"
                        className="h-9 flex-1 rounded-xl border-border/60 bg-muted/30 font-mono text-xs uppercase focus-visible:ring-primary"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Màu nền tiêu đề, đường viền nhấn và biểu đồ trong báo cáo.
                    </p>
                  </div>

                  {/* Secondary Color */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="secondary_color"
                      className="text-xs font-semibold text-foreground"
                    >
                      Màu phụ
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <div className="shadow-xs relative flex h-9 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60">
                        <input
                          id="secondary_color_picker"
                          type="color"
                          disabled={!isOwnerOrAdmin}
                          value={formData.secondary_color || "#64748B"}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))
                          }
                          className="h-12 w-12 cursor-pointer border-0 p-0"
                        />
                      </div>
                      <Input
                        id="secondary_color"
                        disabled={!isOwnerOrAdmin}
                        value={formData.secondary_color}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))
                        }
                        placeholder="#64748B"
                        className="h-9 flex-1 rounded-xl border-border/60 bg-muted/30 font-mono text-xs uppercase focus-visible:ring-primary"
                      />
                      {formData.secondary_color && isOwnerOrAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData((prev) => ({ ...prev, secondary_color: "" }))}
                          className="h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                        >
                          Đặt lại
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Màu phụ trợ cho các chuỗi số liệu thứ 2 hoặc nhãn phụ.
                    </p>
                  </div>
                </div>

                {/* Font Family */}
                {(() => {
                  const activeFontValue = FONT_FAMILY_OPTIONS.some(
                    (f) => f.value === formData.font_family
                  )
                    ? formData.font_family
                    : FONT_FAMILY_OPTIONS.find(
                        (f) =>
                          formData.font_family &&
                          f.value
                            .toLowerCase()
                            .includes(
                              formData.font_family
                                .toLowerCase()
                                .split(",")[0]
                                .trim()
                                .replace(/['"]/g, "")
                            )
                      )?.value || "Inter, sans-serif";

                  return (
                    <div className="space-y-2">
                      <Label
                        htmlFor="font_family"
                        className="text-xs font-semibold text-foreground"
                      >
                        Phông chữ thương hiệu
                      </Label>
                      <Select
                        disabled={!isOwnerOrAdmin}
                        value={activeFontValue}
                        onValueChange={(val) =>
                          setFormData((prev) => ({ ...prev, font_family: val }))
                        }
                      >
                        <SelectTrigger
                          id="font_family"
                          className="h-9 w-full rounded-xl border-border/60 bg-muted/30 text-xs transition-all hover:border-border hover:bg-muted/50 focus:bg-background focus:ring-1 focus:ring-primary/20"
                        >
                          <SelectValue placeholder="Chọn phông chữ cho báo cáo..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-64 rounded-2xl border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md">
                          {FONT_FAMILY_OPTIONS.map((f) => (
                            <SelectItem
                              key={f.value}
                              value={f.value}
                              hideIndicator
                              className="cursor-pointer rounded-xl px-3 py-2 text-xs transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
                            >
                              <span style={{ fontFamily: f.value }}>{f.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Phông chữ sẽ được áp dụng đồng bộ cho toàn bộ nội dung văn bản và bảng số
                        liệu trên tệp PDF.
                      </p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* 3. Header & Footer Layout Content */}
            <Card className="border border-border/50 bg-card/50 shadow-md backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Nội dung trang báo cáo
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Cấu hình tiêu đề đầu trang, chân trang và watermark bảo vệ tài liệu
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="header_text" className="text-xs font-semibold text-foreground">
                    Tiêu đề đầu trang
                  </Label>
                  <Input
                    id="header_text"
                    disabled={!isOwnerOrAdmin}
                    value={formData.header_text}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, header_text: e.target.value }))
                    }
                    placeholder="VD: Vielora Analytics - Monthly Intelligence Report"
                    className="h-9 rounded-xl border-border/60 bg-muted/30 text-xs focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer_text" className="text-xs font-semibold text-foreground">
                    Chân trang
                  </Label>
                  <Input
                    id="footer_text"
                    disabled={!isOwnerOrAdmin}
                    value={formData.footer_text}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, footer_text: e.target.value }))
                    }
                    placeholder="VD: Tài liệu nội bộ mật - Không sao chép dưới mọi hình thức"
                    className="h-9 rounded-xl border-border/60 bg-muted/30 text-xs focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="watermark_url" className="text-xs font-semibold text-foreground">
                    Watermark URL
                  </Label>
                  <Input
                    id="watermark_url"
                    disabled={!isOwnerOrAdmin}
                    value={formData.watermark_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, watermark_url: e.target.value }))
                    }
                    placeholder="https://..."
                    className="h-9 rounded-xl border-border/60 bg-muted/30 text-xs focus-visible:ring-primary"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Hình ảnh chìm chống sao chép xuất hiện mờ phía sau nội dung PDF.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Save Button Bar */}
            {isOwnerOrAdmin && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
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
            )}
          </div>

          {/* Preview Column: Reusable ReportDocumentPreview in branding mode */}
          <div className="lg:col-span-5">
            <ReportDocumentPreview
              mode="branding"
              branding={{
                ...formData,
                logo_url: logoPreviewUrl || formData.logo_url,
              }}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
