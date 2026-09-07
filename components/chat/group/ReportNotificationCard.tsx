"use client";

import { FileText, Download } from "lucide-react";
import { type WidgetTranslations } from "@/lib/i18n/widget-translations";
import {
  extractReportMetadata,
  resolveReportLanguage,
} from "@/lib/helpers/group-chat-report.helper";
import { ESystemLanguage } from "@/types/enums";

export interface ReportNotificationCardProps {
  content: string;
  createdAt: string;
  locale?: ESystemLanguage | string;
  t: WidgetTranslations;
}

export function ReportNotificationCard({
  content,
  createdAt,
  locale = ESystemLanguage.Vi,
  t,
}: ReportNotificationCardProps) {
  const meta = extractReportMetadata(content, createdAt, locale);

  return (
    <div className="shadow-2xs rounded-tl-xs flex flex-col gap-2 rounded-2xl border border-border bg-card p-3.5 text-foreground">
      {/* Card Header: Icon & Main Title */}
      <div className="flex items-center gap-2.5 border-b border-border/60 pb-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-xs font-semibold text-foreground" title={meta.mainTitle}>
            {meta.mainTitle}
          </h4>
          {meta.hasCustomTitle && meta.templateName ? (
            <p className="truncate text-[10.5px] text-muted-foreground">
              {t.reportTemplateLabel}: {meta.templateName}
            </p>
          ) : null}
        </div>
      </div>

      {/* Meta info: Export Date & Requester */}
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
          {meta.formattedExportDate && (
            <div>
              <span>{t.reportExportDateLabel}: </span>
              <span className="font-medium text-foreground">{meta.formattedExportDate}</span>
            </div>
          )}
          {meta.requester && (
            <div>
              <span>{t.reportRequesterLabel}: </span>
              <span className="font-medium text-foreground">{meta.requester}</span>
            </div>
          )}
        </div>
      </div>

      {/* PDF Download Links with Flags and Localized Language Labels */}
      {meta.downloadLinks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {meta.downloadLinks.map((link, idx) => {
            const langMeta = resolveReportLanguage(link.label, t);
            const downloadTitle = t.reportDownloadButton.replace("{lang}", langMeta.name);

            return (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={downloadTitle}
                aria-label={downloadTitle}
                className="shadow-2xs inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs font-medium text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95"
              >
                <Download className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs leading-none">{langMeta.flag}</span>
                <span className="py-0.2 rounded bg-background px-1 text-[9px] font-bold text-muted-foreground">
                  PDF
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
