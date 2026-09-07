import { ESystemLanguage, EReportLanguage } from "@/types/enums";
import { REPORT_LANGUAGE_LABELS } from "@/lib/constants/languages";
import { getLocaleDateTag, type WidgetTranslations } from "@/lib/i18n/widget-translations";

export interface ResolvedLanguageMeta {
  flag: string;
  name: string;
}

export interface ReportDownloadLink {
  label: string;
  url: string;
}

export interface ReportCardMetadata {
  mainTitle: string;
  templateName: string;
  reportTitle: string;
  requester: string;
  hasCustomTitle: boolean;
  formattedExportDate: string;
  downloadLinks: ReportDownloadLink[];
}

/**
 * Phân giải nhãn ngôn ngữ tải file PDF thành Meta cờ và tên ngôn ngữ địa phương hóa
 */
export function resolveReportLanguage(
  rawLabel: string,
  t: WidgetTranslations
): ResolvedLanguageMeta {
  const clean = rawLabel
    .replace(/\s*\(PDF\)\s*/i, "")
    .trim()
    .toLowerCase();

  // 1. Đối soát với EReportLanguage & ESystemLanguage
  if (
    clean === EReportLanguage.Ar ||
    clean.includes("ả rập") ||
    clean.includes("arabic") ||
    clean.includes("ar")
  ) {
    return {
      flag: REPORT_LANGUAGE_LABELS[EReportLanguage.Ar]?.flag || "🇸🇦",
      name: t.langArabic,
    };
  }

  if (
    clean === ESystemLanguage.Vi ||
    clean === EReportLanguage.Vi ||
    clean.includes("việt") ||
    clean.includes("vietnamese") ||
    clean.includes("vi")
  ) {
    return {
      flag: REPORT_LANGUAGE_LABELS[EReportLanguage.Vi]?.flag || "🇻🇳",
      name: t.langVietnamese,
    };
  }

  if (
    clean === ESystemLanguage.En ||
    clean === EReportLanguage.En ||
    clean.includes("english") ||
    clean.includes("en")
  ) {
    return {
      flag: REPORT_LANGUAGE_LABELS[EReportLanguage.En]?.flag || "🇬🇧",
      name: t.langEnglish,
    };
  }

  // 2. Các ngôn ngữ phụ khác nếu có
  if (clean.includes("nhật") || clean.includes("ja") || clean.includes("japanese")) {
    return { flag: "🇯🇵", name: t.langJapanese };
  }
  if (clean.includes("hàn") || clean.includes("ko") || clean.includes("korean")) {
    return { flag: "🇰🇷", name: t.langKorean };
  }
  if (clean.includes("trung") || clean.includes("zh") || clean.includes("chinese")) {
    return { flag: "🇨🇳", name: t.langChinese };
  }
  if (clean.includes("pháp") || clean.includes("fr") || clean.includes("french")) {
    return { flag: "🇫🇷", name: t.langFrench };
  }
  if (clean.includes("đức") || clean.includes("de") || clean.includes("german")) {
    return { flag: "🇩🇪", name: t.langGerman };
  }
  if (clean.includes("tây ban nha") || clean.includes("es") || clean.includes("spanish")) {
    return { flag: "🇪🇸", name: t.langSpanish };
  }

  return {
    flag: "🌐",
    name: rawLabel.replace(/\s*\(PDF\)\s*/i, "").trim(),
  };
}

/**
 * Trích xuất dữ liệu thẻ báo cáo từ nội dung tin nhắn Markdown
 */
export function extractReportMetadata(
  content: string,
  createdAt: string,
  locale: ESystemLanguage | string = ESystemLanguage.Vi
): ReportCardMetadata {
  const lines = content.split("\n");
  let templateName = "";
  let reportTitle = "";
  let requester = "";

  for (const line of lines) {
    if (line.includes("Mẫu báo cáo") || line.includes("Report Template")) {
      const parts = line.split(":");
      if (parts.length > 1) {
        templateName = parts.slice(1).join(":").replace(/[*_`]/g, "").trim();
      }
    } else if (line.includes("Tiêu đề") || line.includes("Title")) {
      const parts = line.split(":");
      if (parts.length > 1) {
        reportTitle = parts.slice(1).join(":").replace(/[*_`]/g, "").trim();
      }
    } else if (
      line.includes("Người yêu cầu") ||
      line.includes("Người xuất") ||
      line.includes("Requester")
    ) {
      const parts = line.split(":");
      if (parts.length > 1) {
        requester = parts
          .slice(1)
          .join(":")
          .replace(/[*_`@]/g, "")
          .trim();
      }
    }
  }

  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const downloadLinks: ReportDownloadLink[] = [];
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(content)) !== null) {
    downloadLinks.push({ label: match[1], url: match[2] });
  }

  const hasCustomTitle = Boolean(
    reportTitle && reportTitle.trim() && reportTitle.trim() !== templateName.trim()
  );
  const mainTitle = hasCustomTitle
    ? reportTitle.trim()
    : templateName && templateName.trim()
      ? templateName.trim()
      : "Báo cáo PDF Bot";

  const exportDate = new Date(createdAt);
  const formattedExportDate = !isNaN(exportDate.getTime())
    ? exportDate.toLocaleDateString(getLocaleDateTag(locale), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return {
    mainTitle,
    templateName,
    reportTitle,
    requester,
    hasCustomTitle,
    formattedExportDate,
    downloadLinks,
  };
}
