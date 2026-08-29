import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, ShieldAlert, Bot, Sparkles, Type, ImageIcon } from "lucide-react";
import { SectionType, TemplateSectionConfig } from "@/types";
import {
  SECTION_TYPE_METADATA,
  AVAILABLE_BIND_KEYS,
  COMMON_I18N_KEYS,
  AVAILABLE_TABLE_COLUMNS,
} from "@/lib/constants";
import type { WorkspaceBranding } from "@/lib/reports/branding-provider";

export interface ReportDocumentPreviewProps {
  mode?: "branding" | "template";
  templateName?: string;
  sections?: TemplateSectionConfig[];
  branding?:
    | WorkspaceBranding
    | {
        brand_name?: string;
        logo_url?: string;
        primary_color?: string;
        secondary_color?: string;
        font_family?: string;
        header_text?: string;
        footer_text?: string;
        watermark_url?: string;
        brandName?: string | null;
        logoUrl?: string | null;
        primaryColor?: string | null;
        secondaryColor?: string | null;
        fontFamily?: string | null;
        headerText?: string | null;
        footerText?: string | null;
        watermarkUrl?: string | null;
      }
    | null;
}

export type TemplateOutlinePreviewProps = ReportDocumentPreviewProps;

export function ReportDocumentPreview({
  mode = "template",
  templateName = "",
  sections = [],
  branding,
}: ReportDocumentPreviewProps) {
  const brandName =
    (branding && ("brandName" in branding ? branding.brandName : branding.brand_name)) || "VIELORA";
  const logoUrl =
    (branding && ("logoUrl" in branding ? branding.logoUrl : branding.logo_url)) || null;
  const primaryColor =
    (branding && ("primaryColor" in branding ? branding.primaryColor : branding.primary_color)) ||
    "#3B82F6";
  const secondaryColor =
    (branding &&
      ("secondaryColor" in branding ? branding.secondaryColor : branding.secondary_color)) ||
    null;
  const fontFamily =
    (branding && ("fontFamily" in branding ? branding.fontFamily : branding.font_family)) ||
    "Inter, sans-serif";
  const headerText =
    (branding && ("headerText" in branding ? branding.headerText : branding.header_text)) || null;
  const footerText =
    (branding && ("footerText" in branding ? branding.footerText : branding.footer_text)) || null;
  const watermarkUrl =
    (branding && ("watermarkUrl" in branding ? branding.watermarkUrl : branding.watermark_url)) ||
    null;

  const isBrandingMode = mode === "branding";

  return (
    <div className="sticky top-20 space-y-4">
      <Card className="overflow-hidden border border-border/60 bg-card/60 shadow-xl backdrop-blur-md">
        <CardHeader className="border-b border-border/40 bg-muted/30 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                {isBrandingMode ? "Xem trước nhận diện thương hiệu" : "Mô phỏng tài liệu A4"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {!isBrandingMode && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  {sections.length} phần
                </span>
              )}
              <Badge
                variant="secondary"
                className="rounded-md border border-border/60 bg-background/80 px-2 py-0.5 text-[9px] font-semibold text-primary"
              >
                {isBrandingMode ? "Branding Live Preview" : "A4 Live Preview"}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {/* Simulated A4 Paper Canvas */}
          <div
            className="relative flex min-h-[500px] flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-background p-5 shadow-sm transition-all"
            style={{ fontFamily }}
          >
            {/* Top Accent Strip with Workspace Branding Primary Color */}
            <div
              className="absolute left-0 right-0 top-0 h-1.5 rounded-t-2xl"
              style={{ backgroundColor: primaryColor }}
            />

            {/* Optional Watermark Overlay Layer */}
            {watermarkUrl && (
              <div className="pointer-events-none absolute inset-0 flex select-none items-center justify-center p-8 opacity-[0.06]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={watermarkUrl}
                  alt="Watermark"
                  className="max-h-56 max-w-56 object-contain"
                />
              </div>
            )}

            <div className="relative z-10 space-y-4">
              {/* Document Header Bar with Workspace Branding */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3 pt-1">
                <div className="flex items-center gap-2.5">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={brandName}
                      className="h-7 w-auto max-w-[120px] rounded object-contain"
                    />
                  ) : (
                    <div
                      className="shadow-xs flex h-7 items-center justify-center rounded-lg px-2.5 text-xs font-bold text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {brandName.slice(0, 3).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">
                      {brandName || "Tên thương hiệu"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {headerText || templateName || "Báo cáo phân tích tự động"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-[10px] text-muted-foreground">19/08/2026</span>
                  <p className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                    ● Sẵn sàng xuất PDF
                  </p>
                </div>
              </div>

              {/* Mode-specific Document Body */}
              {isBrandingMode ? (
                /* === BRANDING TAB SHOWCASE BODY === */
                <div className="space-y-3.5 pt-1">
                  {/* 1. Typography & Headline Showcase */}
                  <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/15 p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-1 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <p className="text-xs font-bold text-foreground">Đoạn văn & Tiêu đề mẫu</p>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Tài liệu được áp dụng phông chữ{" "}
                      <span className="font-semibold text-foreground">
                        {fontFamily.split(",")[0].replace(/['"]/g, "")}
                      </span>
                      . Tự động căn lề và định dạng bảng chuẩn xuất in A4.
                    </p>
                    <div className="space-y-1 pt-1">
                      <div className="h-1.5 w-full rounded bg-muted-foreground/15" />
                      <div className="h-1.5 w-[88%] rounded bg-muted-foreground/15" />
                    </div>
                  </div>

                  {/* 2. Color Palette Harmony Showcase */}
                  <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/15 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-1 rounded-full"
                          style={{ backgroundColor: primaryColor }}
                        />
                        <p className="text-xs font-bold text-foreground">
                          Phối màu biểu đồ & chỉ số
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: primaryColor }}
                          />
                          Màu chính
                        </span>
                        {secondaryColor && (
                          <span className="flex items-center gap-1 font-medium text-muted-foreground">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: secondaryColor }}
                            />
                            Màu phụ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dual Metrics Box */}
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className="rounded-lg border p-2.5"
                        style={{
                          borderColor: `${primaryColor}30`,
                          backgroundColor: `${primaryColor}08`,
                        }}
                      >
                        <p className="text-[10px] text-muted-foreground">Chỉ số tăng trưởng A</p>
                        <p className="mt-0.5 text-sm font-bold" style={{ color: primaryColor }}>
                          +34.8%
                        </p>
                      </div>

                      <div
                        className="rounded-lg border p-2.5"
                        style={{
                          borderColor: `${secondaryColor || primaryColor}30`,
                          backgroundColor: `${secondaryColor || primaryColor}08`,
                        }}
                      >
                        <p className="text-[10px] text-muted-foreground">Chỉ số năng lực B</p>
                        <p
                          className="mt-0.5 text-sm font-bold"
                          style={{ color: secondaryColor || primaryColor }}
                        >
                          88.5 / 100
                        </p>
                      </div>
                    </div>

                    {/* Dual Color Comparative Bar Chart */}
                    <div className="rounded-lg border border-border/40 bg-background/80 p-2.5">
                      <div className="flex h-16 items-end justify-between gap-2 px-2">
                        {[
                          { p: 40, s: 25 },
                          { p: 70, s: 50 },
                          { p: 50, s: 65 },
                          { p: 90, s: 75 },
                          { p: 65, s: 45 },
                          { p: 85, s: 70 },
                        ].map((pair, i) => (
                          <div key={i} className="flex flex-1 items-end justify-center gap-1">
                            <div
                              className="w-full rounded-t-sm transition-all"
                              style={{
                                height: `${pair.p}%`,
                                backgroundColor: primaryColor,
                              }}
                            />
                            {secondaryColor && (
                              <div
                                className="w-full rounded-t-sm transition-all"
                                style={{
                                  height: `${pair.s}%`,
                                  backgroundColor: secondaryColor,
                                  opacity: 0.85,
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* === TEMPLATE TAB SECTIONS FLOW BODY === */
                <div className="space-y-3.5 pt-1">
                  {sections.length === 0 ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center">
                      <Sparkles className="mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-xs font-semibold text-foreground">Chưa có section nào</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Thêm section ở bảng điều khiển bên trái để xem mô phỏng giao diện tài liệu.
                      </p>
                    </div>
                  ) : (
                    sections.map((sec, idx) => {
                      const meta =
                        SECTION_TYPE_METADATA[sec.type as SectionType] ||
                        SECTION_TYPE_METADATA.hero;
                      const titleText =
                        COMMON_I18N_KEYS.find((k) => k.value === sec.titleI18n)?.label ||
                        sec.titleI18n ||
                        meta.label;
                      const bindText = AVAILABLE_BIND_KEYS.find((k) => k.value === sec.bind)?.label;

                      return (
                        <div
                          key={sec.id}
                          className="hover:shadow-xs group relative rounded-xl border border-border/60 bg-muted/15 p-3 transition-all hover:border-primary/40 hover:bg-muted/30"
                        >
                          {/* Section Header with Index Badge */}
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-4 w-4 items-center justify-center rounded-md bg-muted text-[9px] font-bold text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary">
                                {idx + 1}
                              </span>
                              <span className="text-[11px] font-bold text-foreground">
                                {titleText}
                              </span>
                            </div>

                            {bindText && (
                              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                                {bindText}
                              </span>
                            )}
                          </div>

                          {/* Section Type Specific Skeletons & Mini Mockups */}
                          {sec.type === "hero" && (
                            <div className="shadow-2xs flex items-center gap-3 rounded-xl border border-border/50 bg-background/90 p-3">
                              <div
                                className="shadow-xs flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                                style={{ backgroundColor: primaryColor }}
                              >
                                <Bot className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-foreground">
                                  Trợ lý AI (Tên Bot)
                                </p>
                                <p className="truncate font-mono text-[10px] text-muted-foreground">
                                  bot.workspace.domain.vn
                                </p>
                              </div>
                            </div>
                          )}

                          {sec.type === "text-block" && (
                            <div className="space-y-1.5 rounded-lg border border-border/40 bg-background/60 p-2.5">
                              <div className="h-2 w-full rounded bg-muted-foreground/15" />
                              <div className="h-2 w-[92%] rounded bg-muted-foreground/15" />
                              <div className="h-2 w-[68%] rounded bg-muted-foreground/15" />
                            </div>
                          )}

                          {sec.type === "summary-list" && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/70 px-2.5 py-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: primaryColor }}
                                  />
                                  <div className="h-2 w-32 rounded bg-muted-foreground/20" />
                                </div>
                                <span className="font-mono text-[9px] font-semibold text-muted-foreground">
                                  45%
                                </span>
                              </div>
                              <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/70 px-2.5 py-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: primaryColor }}
                                  />
                                  <div className="h-2 w-24 rounded bg-muted-foreground/20" />
                                </div>
                                <span className="font-mono text-[9px] font-semibold text-muted-foreground">
                                  32%
                                </span>
                              </div>
                              <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/70 px-2.5 py-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: primaryColor }}
                                  />
                                  <div className="h-2 w-28 rounded bg-muted-foreground/20" />
                                </div>
                                <span className="font-mono text-[9px] font-semibold text-muted-foreground">
                                  23%
                                </span>
                              </div>
                            </div>
                          )}

                          {sec.type === "chart" &&
                            (() => {
                              const chartType =
                                sec.bind === "topicDistribution"
                                  ? "bar"
                                  : sec.bind === "topicTrends"
                                    ? "line"
                                    : sec.bind === "competencyRadar"
                                      ? "radar"
                                      : sec.chart === "bar"
                                        ? "bar"
                                        : sec.chart === "line"
                                          ? "line"
                                          : "radar";

                              return (
                                <div className="overflow-hidden rounded-lg border border-border/40 bg-background/80 p-2.5">
                                  {/* Radar Chart Mockup */}
                                  {chartType === "radar" && (
                                    <div className="flex h-20 items-center justify-center py-1">
                                      <svg
                                        className="h-18 w-18 overflow-visible"
                                        viewBox="0 0 100 100"
                                      >
                                        {/* Web Rings */}
                                        <polygon
                                          points="50,10 90,38 75,85 25,85 10,38"
                                          fill="none"
                                          stroke="currentColor"
                                          className="text-border/60"
                                          strokeWidth="1"
                                        />
                                        <polygon
                                          points="50,25 75,42 65,72 35,72 25,42"
                                          fill="none"
                                          stroke="currentColor"
                                          className="text-border/40"
                                          strokeWidth="1"
                                        />
                                        {/* Filled Radar polygon */}
                                        <polygon
                                          points="50,18 80,40 68,80 30,70 18,36"
                                          fill={primaryColor}
                                          fillOpacity="0.35"
                                          stroke={primaryColor}
                                          strokeWidth="2"
                                        />
                                      </svg>
                                    </div>
                                  )}

                                  {/* Bar Chart Mockup */}
                                  {chartType === "bar" && (
                                    <div className="flex h-20 items-end justify-between gap-2 px-3 pt-2">
                                      {[40, 70, 45, 90, 60, 80].map((h, i) => (
                                        <div
                                          key={i}
                                          className="w-full rounded-t-md transition-all group-hover:opacity-90"
                                          style={{
                                            height: `${h}%`,
                                            backgroundColor: primaryColor,
                                            opacity: 0.85,
                                          }}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {/* Line Chart Mockup */}
                                  {chartType === "line" && (
                                    <div className="h-20 w-full">
                                      <svg
                                        className="h-full w-full overflow-visible"
                                        viewBox="0 0 200 60"
                                        preserveAspectRatio="none"
                                      >
                                        <defs>
                                          <linearGradient
                                            id={`chartGrad-${sec.id}`}
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                          >
                                            <stop
                                              offset="0%"
                                              stopColor={primaryColor}
                                              stopOpacity="0.3"
                                            />
                                            <stop
                                              offset="100%"
                                              stopColor={primaryColor}
                                              stopOpacity="0.0"
                                            />
                                          </linearGradient>
                                        </defs>
                                        {/* Gridlines */}
                                        <line
                                          x1="0"
                                          y1="15"
                                          x2="200"
                                          y2="15"
                                          stroke="currentColor"
                                          className="text-border/40"
                                          strokeDasharray="2,2"
                                        />
                                        <line
                                          x1="0"
                                          y1="35"
                                          x2="200"
                                          y2="35"
                                          stroke="currentColor"
                                          className="text-border/40"
                                          strokeDasharray="2,2"
                                        />
                                        <line
                                          x1="0"
                                          y1="55"
                                          x2="200"
                                          y2="55"
                                          stroke="currentColor"
                                          className="text-border/40"
                                          strokeDasharray="2,2"
                                        />
                                        {/* Area Fill */}
                                        <path
                                          d="M 0 45 Q 35 15, 70 30 T 140 10 T 200 25 L 200 60 L 0 60 Z"
                                          fill={`url(#chartGrad-${sec.id})`}
                                        />
                                        {/* Line */}
                                        <path
                                          d="M 0 45 Q 35 15, 70 30 T 140 10 T 200 25"
                                          fill="none"
                                          stroke={primaryColor}
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                        />
                                        {/* Points */}
                                        <circle cx="70" cy="30" r="3" fill={primaryColor} />
                                        <circle cx="140" cy="10" r="3" fill={primaryColor} />
                                        <circle cx="200" cy="25" r="3" fill={primaryColor} />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                          {sec.type === "table" &&
                            (() => {
                              const availableCols =
                                (sec.bind && AVAILABLE_TABLE_COLUMNS[sec.bind]) ||
                                AVAILABLE_TABLE_COLUMNS.default;
                              const rawColumns = (sec.options?.columns as string[]) || [];
                              const validColumns = rawColumns.filter((colKey) =>
                                availableCols.some((c) => c.key === colKey)
                              );
                              const currentColumns =
                                validColumns.length > 0
                                  ? validColumns
                                  : availableCols.map((c) => c.key);

                              return (
                                <div className="overflow-x-auto rounded-lg border border-border/50 bg-background/90 text-[10px]">
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="border-b border-border/50 bg-muted/40 text-muted-foreground">
                                        {currentColumns.map((colKey) => {
                                          const colMeta = availableCols.find(
                                            (c) => c.key === colKey
                                          );
                                          const labelText = colMeta
                                            ? colMeta.label.split("(")[0].trim()
                                            : colKey;
                                          return (
                                            <th key={colKey} className="px-2 py-1 font-semibold">
                                              {labelText}
                                            </th>
                                          );
                                        })}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                      <tr className="hover:bg-muted/20">
                                        {currentColumns.map((colKey, i) => (
                                          <td key={colKey} className="px-2 py-1 text-foreground">
                                            {i === 0
                                              ? "Kỳ 1"
                                              : i === 1
                                                ? "Toán AI"
                                                : i === 2
                                                  ? "8.5"
                                                  : "+1.2"}
                                          </td>
                                        ))}
                                      </tr>
                                      <tr className="hover:bg-muted/20">
                                        {currentColumns.map((colKey, i) => (
                                          <td key={colKey} className="px-2 py-1 text-foreground">
                                            {i === 0
                                              ? "Kỳ 2"
                                              : i === 1
                                                ? "Logic Pro"
                                                : i === 2
                                                  ? "9.0"
                                                  : "+0.5"}
                                          </td>
                                        ))}
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()}

                          {sec.type === "disclaimer" && (
                            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-300">
                              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                              <div className="space-y-1 text-[9px] leading-tight">
                                <p className="font-semibold">Quy định miễn trừ trách nhiệm</p>
                                <div className="h-1.5 w-full rounded bg-amber-500/20" />
                                <div className="h-1.5 w-4/5 rounded bg-amber-500/20" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Universal Document Running Footer Bar */}
              <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
                <p className="max-w-[75%] truncate font-medium">
                  {footerText || `© 2026 ${brandName || "VIELORA"} · All rights reserved.`}
                </p>
                <span className="shrink-0 font-mono text-[9px]">Trang 1/1</span>
              </div>
            </div>

            {/* Simulated Document Caption Bar */}
            <div className="relative z-10 mt-5 border-t border-border/50 pt-2.5 text-center text-[10px] text-muted-foreground">
              <p>
                {isBrandingMode
                  ? "Xem trước trực tiếp nhận diện thương hiệu · Áp dụng cho mọi báo cáo xuất PDF"
                  : "Bản xem trước A4 trực quan · Tự động áp dụng màu thương hiệu & bố cục in"}
              </p>
            </div>
          </div>

          {/* Visual Style Summary Chips */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="font-medium text-foreground">Primary: {primaryColor}</span>
            </div>

            {secondaryColor && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: secondaryColor }}
                />
                <span className="font-medium text-foreground">Secondary: {secondaryColor}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1">
              <Type className="h-3 w-3 text-muted-foreground" />
              <span>{fontFamily.split(",")[0].replace(/['"]/g, "")}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1">
              <ImageIcon className="h-3 w-3 text-muted-foreground" />
              <span>{watermarkUrl ? "Có Watermark" : "Không Watermark"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { ReportDocumentPreview as TemplateOutlinePreview };
