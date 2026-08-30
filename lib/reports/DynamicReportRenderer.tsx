"use client";

import React from "react";
import type { WorkspaceBranding } from "@/lib/reports/branding-provider";
import type { TemplateSectionConfig, SectionType } from "@/types";
import {
  SECTION_TYPE_METADATA,
  COMMON_I18N_KEYS,
  AVAILABLE_TABLE_COLUMNS,
} from "@/lib/constants/report-template";

export interface DynamicReportRendererProps {
  schemaTitle?: string;
  sections?: TemplateSectionConfig[];
  data: Record<string, unknown>;
  branding: WorkspaceBranding;
  language: string;
  i18n?: Record<string, string>;
  reportTitle?: string;
}

/**
 * Pure SVG Radar Chart for crisp, reliable, error-free PDF snapshotting.
 */
function PureSvgRadarChart({
  data,
  primaryColor = "#3B82F6",
  max = 10,
}: {
  data: Array<{ axis: string; value: number; fullMark?: number }>;
  primaryColor?: string;
  max?: number;
}) {
  if (!data || data.length === 0) return null;

  const size = 360;
  const center = size / 2;
  const radius = 72;
  const count = data.length;
  const angleStep = (Math.PI * 2) / count;

  // Concentric levels (25%, 50%, 75%, 100%)
  const levels = [0.25, 0.5, 0.75, 1.0];

  // Calculate polygon points for data
  const dataPoints = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (Math.min(max, Math.max(0, d.value)) / max) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, ...d, angle };
  });

  const polygonPointsStr = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div
      dir="ltr"
      className="flex w-full flex-col items-center justify-center py-2"
      style={{ direction: "ltr" }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ direction: "ltr" }}
        className="h-64 w-64 max-w-full select-none overflow-visible"
      >
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0.08" />
          </radialGradient>
        </defs>

        {/* Concentric Guide Polygons */}
        {levels.map((lvl, lIdx) => {
          const lvlPoints = Array.from({ length: count })
            .map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const r = lvl * radius;
              const x = center + r * Math.cos(angle);
              const y = center + r * Math.sin(angle);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");

          return (
            <polygon
              key={lIdx}
              points={lvlPoints}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray={lIdx < levels.length - 1 ? "2 2" : undefined}
            />
          );
        })}

        {/* Axis Spoke Lines */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          );
        })}

        {/* Filled Data Polygon */}
        <polygon
          points={polygonPointsStr}
          fill="url(#radarGlow)"
          stroke={primaryColor}
          strokeWidth="2.5"
        />

        {/* Data Point Markers & Labels */}
        {dataPoints.map((p, i) => {
          const labelDist = radius + 34;
          const lx = center + labelDist * Math.cos(p.angle);
          const ly = center + labelDist * Math.sin(p.angle);

          const cosVal = Math.cos(p.angle);
          const textAnchor = Math.abs(cosVal) < 0.25 ? "middle" : cosVal > 0 ? "start" : "end";

          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#ffffff"
                stroke={primaryColor}
                strokeWidth="2"
              />
              <text
                x={lx}
                y={ly + 3.5}
                textAnchor={textAnchor}
                className="fill-slate-700 text-[9px] font-semibold"
                style={{ fontSize: "9px", direction: "ltr", unicodeBidi: "plaintext" }}
              >
                {p.axis} ({p.value})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Pure SVG Line Chart for 7-day Interaction Trends.
 */
function PureSvgLineChart({
  data,
  primaryColor = "#3B82F6",
  secondaryColor = "#10B981",
}: {
  data: Array<{ date: string; queries: number; documents: number }>;
  primaryColor?: string;
  secondaryColor?: string;
}) {
  if (!data || data.length === 0) return null;

  const width = 560;
  const height = 160;
  const padding = { top: 16, right: 24, bottom: 24, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.flatMap((d) => [d.queries || 0, d.documents || 0, 40])) * 1.15;
  const stepX = chartW / (data.length - 1 || 1);

  const getPoints = (key: "queries" | "documents") =>
    data.map((d, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartH - ((d[key] || 0) / maxVal) * chartH;
      return { x, y, val: d[key] };
    });

  const queryPoints = getPoints("queries");
  const docPoints = getPoints("documents");

  const queryPath = queryPoints.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ""
  );
  const docPath = docPoints.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ""
  );

  return (
    <div dir="ltr" className="w-full py-1" style={{ direction: "ltr" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ direction: "ltr" }}
        className="w-full select-none overflow-visible"
      >
        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
          const y = padding.top + chartH * (1 - ratio);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-400 text-[8.5px]"
              >
                {Math.round(ratio * maxVal)}
              </text>
            </g>
          );
        })}

        {/* Trend Paths */}
        <path d={queryPath} fill="none" stroke={primaryColor} strokeWidth="2.2" />
        <path
          d={docPath}
          fill="none"
          stroke={secondaryColor}
          strokeWidth="1.8"
          strokeDasharray="3 3"
        />

        {/* Data points */}
        {queryPoints.map((p, i) => (
          <circle
            key={`q-${i}`}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#ffffff"
            stroke={primaryColor}
            strokeWidth="1.8"
          />
        ))}

        {/* X Axis Labels */}
        {data.map((d, i) => {
          const x = padding.left + i * stepX;
          return (
            <text
              key={`x-${i}`}
              x={x}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-500 text-[9.5px] font-medium"
            >
              {d.date}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Pure SVG Bar Chart for Knowledge Topic Asset Distribution.
 */
function PureSvgBarChart({
  data,
  primaryColor = "#3B82F6",
}: {
  data: Array<{ topic: string; count: number; percentage?: number }>;
  primaryColor?: string;
}) {
  if (!data || data.length === 0) return null;

  const width = 560;
  const height = 160;
  const padding = { top: 20, right: 24, bottom: 28, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.count || 0), 6) * 1.25;
  const stepX = chartW / data.length;
  const barWidth = Math.min(44, stepX * 0.55);

  return (
    <div dir="ltr" className="w-full py-1" style={{ direction: "ltr" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ direction: "ltr" }}
        className="w-full select-none overflow-visible"
      >
        {/* Horizontal gridlines */}
        {[0, 0.33, 0.66, 1.0].map((ratio, idx) => {
          const y = padding.top + chartH * (1 - ratio);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-400 text-[8.5px]"
              >
                {Math.round(ratio * maxVal)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = ((d.count || 0) / maxVal) * chartH;
          const x = padding.left + i * stepX + (stepX - barWidth) / 2;
          const y = padding.top + chartH - barH;

          // Shorten topic label if long
          const label = d.topic.length > 18 ? d.topic.slice(0, 16) + "..." : d.topic;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(4, barH)}
                rx="4"
                fill={primaryColor}
                opacity={0.85 + (i % 2) * 0.15}
              />
              {/* Value on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="fill-slate-700 text-[9px] font-bold"
              >
                {d.count}
              </text>
              {/* X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-600 text-[9px] font-medium"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function DynamicReportRenderer({
  schemaTitle,
  sections = [],
  data = {},
  branding,
  language,
  i18n = {},
  reportTitle,
}: DynamicReportRendererProps) {
  const isRtl = language === "ar";
  const primaryColor = branding.primaryColor || "#3B82F6";
  const secondaryColor = branding.secondaryColor || "#10B981";
  const brandName = branding.brandName || "VIELORA";
  const fontFamily =
    branding.fontFamily ||
    (isRtl
      ? "'Noto Sans Arabic', 'Noto Naskh Arabic', 'Scheherazade New', 'KacstTitle', 'DejaVu Sans', sans-serif"
      : "'Inter', 'Noto Sans', 'DejaVu Sans', 'Liberation Sans', -apple-system, BlinkMacSystemFont, sans-serif");

  const t = (key: string, fallback?: string) => i18n[key] || fallback || key;

  const resolvedTitle =
    reportTitle?.trim() ||
    branding.headerText ||
    schemaTitle ||
    t("report.reportTitle", "Báo cáo phân tích chuyên sâu");

  const effectiveSections =
    sections && sections.length > 0
      ? sections
      : [
          { id: "sec-hero", type: "hero" as SectionType, bind: "botIdentity", showBranding: true },
          {
            id: "sec-summary",
            type: "text-block" as SectionType,
            bind: "summary",
            titleI18n: "report.summary",
          },
          {
            id: "sec-topics",
            type: "summary-list" as SectionType,
            bind: "keyTopics",
            titleI18n: "report.keyTopics",
          },
          {
            id: "sec-trends",
            type: "chart" as SectionType,
            bind: "topicTrends",
            titleI18n: "report.topicTrends",
            chart: "line",
          },
          {
            id: "sec-disclaimer",
            type: "disclaimer" as SectionType,
            titleI18n: "report.disclaimer",
          },
          { id: "sec-footer", type: "footer" as SectionType, showBranding: true },
        ];

  const botIdentity = (data.botIdentity as { name: string; domain: string; avatar: string }) || {
    name: "AI Assistant",
    domain: "vielora.vn",
    avatar: null,
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="relative mx-auto min-h-screen max-w-4xl bg-slate-50 p-6 font-sans text-slate-900 md:p-8 print:bg-white print:p-4"
      style={{ fontFamily }}
    >
      {/* Universal Watermark (Image or Text) */}
      {branding.watermarkUrl && (
        <div className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden p-8 opacity-[0.04]">
          {branding.watermarkUrl.startsWith("data:") ||
          branding.watermarkUrl.match(/\.(png|jpe?g|svg|webp|gif)(\?.*)?$/i) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.watermarkUrl} alt="" className="max-h-80 max-w-80 object-contain" />
          ) : (
            <span className="rotate-[-25deg] select-none break-all text-center text-5xl font-black uppercase tracking-widest text-slate-900 md:text-6xl">
              {branding.watermarkUrl.replace(/^https?:\/\/(www\.)?/, "")}
            </span>
          )}
        </div>
      )}

      {/* Top Accent Strip */}
      <div
        className="shadow-xs mb-4 h-1.5 w-full rounded-full"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Top Workspace Header Bar */}
      <header className="mb-4 flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-4 [break-inside:avoid] md:flex-row md:items-center">
        <div className="flex items-center gap-3.5">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={brandName}
              className="h-10 w-auto max-w-[140px] rounded-lg object-contain"
            />
          ) : (
            <div
              className="shadow-xs flex h-10 items-center justify-center rounded-xl px-3.5 text-sm font-bold tracking-wide text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {brandName}
            </div>
          )}
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">{resolvedTitle}</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {brandName} ·{" "}
              {branding.headerText || t("report.defaultSubHeader", "Báo cáo phân tích chuyên sâu")}
            </p>
          </div>
        </div>

        <div className="shadow-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-right text-xs text-slate-500 print:border-none">
          <p>
            <span className="font-semibold text-slate-700">{t("report.date", "Ngày xuất")}:</span>{" "}
            {(data.exportDate as string) || new Date().toLocaleDateString("vi-VN")}
          </p>
        </div>
      </header>

      {/* Render Dynamic Sections Flow */}
      <div className="space-y-4">
        {effectiveSections.map((sec, secIdx) => {
          const meta = SECTION_TYPE_METADATA[sec.type as SectionType] || SECTION_TYPE_METADATA.hero;
          const rawTitle =
            COMMON_I18N_KEYS.find((k) => k.value === sec.titleI18n)?.label ||
            sec.titleI18n ||
            meta.label;
          const sectionTitle = sec.titleI18n ? t(sec.titleI18n, rawTitle) : rawTitle;

          // ==============================
          // 1. HERO SECTION
          // ==============================
          if (sec.type === "hero") {
            return (
              <section
                key={sec.id || secIdx}
                className="shadow-xs rounded-2xl border border-slate-200 bg-white p-5 [break-inside:avoid]"
              >
                <div className="flex items-center gap-4">
                  {botIdentity.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={botIdentity.avatar}
                      alt={botIdentity.name}
                      className="shadow-xs h-16 w-16 rounded-2xl border border-slate-200 object-cover"
                    />
                  ) : (
                    <div
                      className="shadow-xs flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {botIdentity.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{botIdentity.name}</h2>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">{botIdentity.domain}</p>
                  </div>
                </div>
              </section>
            );
          }

          // ==============================
          // 2. TEXT-BLOCK / SUBJECT HEADER
          // ==============================
          if (sec.type === "text-block") {
            if (sec.bind === "subjectHeader" && data.subjectHeader) {
              const subj = data.subjectHeader as { name?: string; class?: string; date?: string };
              return (
                <section
                  key={sec.id || secIdx}
                  className="shadow-xs rounded-xl border border-slate-200 bg-white p-4 [break-inside:avoid]"
                >
                  <div className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <div
                      className="h-3 w-1 rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <h2 className="text-xs font-bold text-slate-900">{sectionTitle}</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {t("report.scopeTitle", "Mục tiêu / Tiêu đề")}
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {subj.name || botIdentity.name}
                      </span>
                    </div>
                    <div>
                      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {t("report.domainTitle", "Tên miền hoạt động")}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {subj.class || botIdentity.domain}
                      </span>
                    </div>
                    <div>
                      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {t("report.organizationTitle", "Đơn vị chủ quản")}
                      </span>
                      <span
                        className="shadow-2xs inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {brandName}
                      </span>
                    </div>
                  </div>
                </section>
              );
            }

            const textContent =
              (data[sec.bind || "summary"] as string) ||
              (sec.bind === "botSummary"
                ? (data.botSummary as string)
                : (data.summary as string)) ||
              "";

            return (
              <section
                key={sec.id || secIdx}
                className="shadow-xs rounded-xl border border-slate-200 bg-white p-4 [break-inside:avoid]"
              >
                <div className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <div className="h-3 w-1 rounded-full" style={{ backgroundColor: primaryColor }} />
                  <h2 className="text-xs font-bold text-slate-900">{sectionTitle}</h2>
                </div>
                <p className="whitespace-pre-line rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs leading-relaxed text-slate-600">
                  {textContent || "Không có nội dung mô tả chi tiết."}
                </p>
              </section>
            );
          }

          // ==============================
          // 3. CHART SECTION (RADAR / LINE / BAR)
          // ==============================
          if (sec.type === "chart") {
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

            if (chartType === "radar") {
              const radarData =
                (data.competencyRadar as Array<{
                  axis: string;
                  value: number;
                  fullMark?: number;
                }>) || [];
              return (
                <section
                  key={sec.id || secIdx}
                  className="shadow-xs rounded-xl border border-slate-200 bg-white p-4 [break-inside:avoid]"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-1 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <h2 className="text-xs font-bold text-slate-900">{sectionTitle}</h2>
                    </div>
                    <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9.5px] font-semibold text-blue-700">
                      {t("report.maxScoreLabel", "Thang điểm: 10")}
                    </span>
                  </div>

                  <PureSvgRadarChart
                    data={radarData}
                    primaryColor={primaryColor}
                    max={sec.options?.max || 10}
                  />
                </section>
              );
            }

            if (chartType === "bar") {
              const barData =
                (data.topicDistribution as Array<{
                  topic: string;
                  count: number;
                  percentage?: number;
                }>) ||
                (data.keyTopics as Array<{ topic: string; count: number }>) ||
                [];

              return (
                <section
                  key={sec.id || secIdx}
                  className="shadow-xs rounded-xl border border-slate-200 bg-white p-4 [break-inside:avoid]"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-1 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <h2 className="text-xs font-bold text-slate-900">{sectionTitle}</h2>
                    </div>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9.5px] font-medium text-slate-600">
                      {t("report.documentsIndexed", "Số lượng tài liệu")}
                    </span>
                  </div>

                  <PureSvgBarChart data={barData} primaryColor={primaryColor} />
                </section>
              );
            }

            // Default to Line Chart (Interaction Trends)
            const trendData =
              (data.topicTrends as Array<{
                date: string;
                queries: number;
                documents: number;
              }>) || [];
            return (
              <section
                key={sec.id || secIdx}
                className="shadow-xs rounded-xl border border-slate-200 bg-white p-4 [break-inside:avoid]"
              >
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-1 rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <h2 className="text-xs font-bold text-slate-900">{sectionTitle}</h2>
                  </div>
                  <div className="flex items-center gap-3 text-[9.5px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                      {t("report.queriesCount", "Lượt truy vấn")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: secondaryColor }}
                      />
                      {t("report.documentsIndexed", "Tài liệu cập nhật")}
                    </span>
                  </div>
                </div>

                <PureSvgLineChart
                  data={trendData}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                />
              </section>
            );
          }

          // ==============================
          // 4. TABLE SECTION
          // ==============================
          if (sec.type === "table") {
            const bindKey = sec.bind || "progressTable";
            const tableRows =
              ((data[bindKey] || data.progressTable) as Array<Record<string, unknown>>) || [];

            const availableCols =
              (bindKey && AVAILABLE_TABLE_COLUMNS[bindKey]) ||
              AVAILABLE_TABLE_COLUMNS.progressTable ||
              AVAILABLE_TABLE_COLUMNS.default;

            const selectedColKeys =
              sec.options?.columns && (sec.options.columns as string[]).length > 0
                ? (sec.options.columns as string[])
                : availableCols.map((c) => c.key);

            const activeCols = availableCols.filter((c) => selectedColKeys.includes(c.key));
            const colsToRender = activeCols.length > 0 ? activeCols : availableCols;

            return (
              <section
                key={sec.id || secIdx}
                className="shadow-xs rounded-xl border border-slate-200 bg-white p-4 [break-inside:avoid]"
              >
                <div className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <div className="h-3 w-1 rounded-full" style={{ backgroundColor: primaryColor }} />
                  <h2 className="text-xs font-bold text-slate-900">{sectionTitle}</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[10.5px] font-semibold text-slate-600">
                        {colsToRender.map((col) => (
                          <th key={col.key} className="px-3 py-2">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tableRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50">
                          {colsToRender.map((col) => {
                            const val = row[col.key];
                            if (col.key === "delta" && typeof val === "string") {
                              const isPositive = val.startsWith("+");
                              return (
                                <td key={col.key} className="px-3 py-2 font-semibold">
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-[10px] ${
                                      isPositive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-rose-50 text-rose-700"
                                    }`}
                                  >
                                    {val}
                                  </span>
                                </td>
                              );
                            }
                            if (col.key === "score" && typeof val === "number") {
                              return (
                                <td key={col.key} className="px-3 py-2 font-bold text-slate-800">
                                  {val}/10
                                </td>
                              );
                            }
                            return (
                              <td key={col.key} className="px-3 py-2 text-slate-600">
                                {String(val ?? "-")}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          }

          // ==============================
          // 5. SUMMARY-LIST SECTION
          // ==============================
          if (sec.type === "summary-list") {
            const bindKey = sec.bind || "keyTopics";

            // If Strengths
            if (bindKey === "strengths" || sec.titleI18n?.includes("strengths")) {
              const list = (data.strengths as string[]) || [];
              return (
                <section
                  key={sec.id || secIdx}
                  className="shadow-xs rounded-xl border border-slate-200 bg-white p-4 [break-inside:avoid]"
                >
                  <div className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2 text-emerald-700">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: secondaryColor }}
                    />
                    <h3 className="text-xs font-bold text-slate-900">{sectionTitle}</h3>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {list.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-bold text-emerald-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            }

            // If Needs Support
            if (bindKey === "needsSupport" || sec.titleI18n?.includes("needsSupport")) {
              const list = (data.needsSupport as string[]) || [];
              return (
                <section
                  key={sec.id || secIdx}
                  className="shadow-xs rounded-xl border border-slate-200 bg-white p-4 [break-inside:avoid]"
                >
                  <div className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2 text-amber-700">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <h3 className="text-xs font-bold text-slate-900">{sectionTitle}</h3>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {list.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-bold text-amber-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            }

            // Default to Key Topics Grid
            const topics =
              (data.keyTopics as Array<{ topic: string; count: number; description: string }>) ||
              [];
            return (
              <section
                key={sec.id || secIdx}
                className="shadow-xs rounded-xl border border-slate-200 bg-white p-4 [break-inside:avoid]"
              >
                <div className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <div className="h-3 w-1 rounded-full" style={{ backgroundColor: primaryColor }} />
                  <h2 className="text-xs font-bold text-slate-900">{sectionTitle}</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {topics.map((topic, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{topic.topic}</span>
                          <span
                            className="shadow-2xs rounded-full px-2 py-0.5 text-[8.5px] font-semibold text-white"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {topic.count} mục
                          </span>
                        </div>
                        <p className="text-[10.5px] leading-relaxed text-slate-500">
                          {topic.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          // ==============================
          // 6. DISCLAIMER SECTION
          // ==============================
          if (sec.type === "disclaimer") {
            return (
              <section
                key={sec.id || secIdx}
                className="disclaimer mt-4 rounded-xl border border-slate-200 bg-slate-100/90 p-3.5 text-xs leading-relaxed text-slate-500 [break-inside:avoid]"
              >
                <p className="mb-1 font-semibold text-slate-700">
                  {t("report.disclaimerTitle", "Quy định miễn trừ trách nhiệm")}
                </p>
                <p>
                  {t(
                    "report.disclaimer",
                    "Lưu ý: Báo cáo này được trích xuất và tổng hợp tự động từ kho dữ liệu tri thức của bot. Thông tin phản ánh hiện trạng dữ liệu được lập chỉ mục tại thời điểm xuất báo cáo."
                  )}
                </p>
              </section>
            );
          }

          // ==============================
          // 7. FOOTER SECTION
          // ==============================
          if (sec.type === "footer") {
            return (
              <footer
                key={sec.id || secIdx}
                className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 text-center text-xs text-slate-500 [break-inside:avoid]"
              >
                <div className="flex items-center justify-center gap-2">
                  {branding.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={branding.logoUrl}
                      alt={brandName}
                      className="h-4 w-auto object-contain"
                    />
                  ) : (
                    <span className="font-bold text-slate-700">{brandName}</span>
                  )}
                  {branding.footerText && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-600">{branding.footerText}</span>
                    </>
                  )}
                </div>
              </footer>
            );
          }

          return null;
        })}
      </div>

      {/* Ready Marker for Puppeteer Snapshotting */}
      <div id="report-ready" style={{ display: "none" }} />
    </div>
  );
}
