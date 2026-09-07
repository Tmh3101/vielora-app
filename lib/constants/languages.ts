import { ESystemLanguage, EReportLanguage } from "@/types/enums";

/**
 * 1. Bot Widget & System Languages (2 ngôn ngữ: vi, en)
 * Dùng cho SettingsTab, Widget Language Switcher, Bot Configuration
 */
export interface SystemLanguageOption {
  value: ESystemLanguage;
  label: string;
  flag: string;
  name: string;
}

export const BOT_WIDGET_LANGUAGES: readonly SystemLanguageOption[] = [
  { value: ESystemLanguage.Vi, label: "Tiếng Việt", flag: "🇻🇳", name: "Tiếng Việt" },
  { value: ESystemLanguage.En, label: "English", flag: "🇬🇧", name: "English" },
] as const;

export const SYSTEM_LANGUAGE_OPTIONS = BOT_WIDGET_LANGUAGES;

/**
 * 2. Report Export Supported Languages (3 ngôn ngữ: vi, en, ar)
 * Dùng cho TemplateGeneralSettings, BrandingTab, ExportReportModal, PDF Generator
 */
export interface ReportLanguageOption {
  id: EReportLanguage;
  value: EReportLanguage;
  label: string;
  flag: string;
  name: string;
}

export const REPORT_SUPPORTED_LANGUAGES: readonly ReportLanguageOption[] = [
  {
    id: EReportLanguage.Vi,
    value: EReportLanguage.Vi,
    label: "Tiếng Việt (VI)",
    flag: "🇻🇳",
    name: "Tiếng Việt",
  },
  {
    id: EReportLanguage.En,
    value: EReportLanguage.En,
    label: "English (EN)",
    flag: "🇬🇧",
    name: "English",
  },
  {
    id: EReportLanguage.Ar,
    value: EReportLanguage.Ar,
    label: "العربية (AR)",
    flag: "🇸🇦",
    name: "العربية",
  },
] as const;

/**
 * Map tra cứu nhanh meta ngôn ngữ cho module Export Report (ExportReportModal, Report Viewer)
 */
export const REPORT_LANGUAGE_LABELS: Record<string, { label: string; flag: string; name: string }> =
  {
    [EReportLanguage.Vi]: { label: "Tiếng Việt (VI)", flag: "🇻🇳", name: "Tiếng Việt" },
    [EReportLanguage.En]: { label: "English (EN)", flag: "🇬🇧", name: "English" },
    [EReportLanguage.Ar]: { label: "العربية (AR)", flag: "🇸🇦", name: "العربية" },
  };

/**
 * 3. Font Family Options
 * Dùng cho Workspace Branding, Template Editor, Report PDF Generator
 */
export interface FontFamilyOption {
  value: string;
  label: string;
  translationKey: string;
}

export const DEFAULT_FONT_FAMILY = "Inter, sans-serif";

export const FONT_FAMILY_OPTIONS: readonly FontFamilyOption[] = [
  {
    value: "Inter, sans-serif",
    label: "Inter (Khuyên dùng)",
    translationKey: "fontOptions.inter",
  },
  {
    value: '"Be Vietnam Pro", sans-serif',
    label: "Be Vietnam Pro (Chuẩn tiếng Việt)",
    translationKey: "fontOptions.beVietnamPro",
  },
  {
    value: "Roboto, sans-serif",
    label: "Roboto (Hiện đại)",
    translationKey: "fontOptions.roboto",
  },
  {
    value: "Outfit, sans-serif",
    label: "Outfit (Hình học, Nổi bật)",
    translationKey: "fontOptions.outfit",
  },
  {
    value: '"Plus Jakarta Sans", sans-serif',
    label: "Plus Jakarta Sans (Sắc nét)",
    translationKey: "fontOptions.plusJakarta",
  },
  {
    value: '"Noto Sans", "Noto Naskh Arabic", sans-serif',
    label: "Noto Sans & Arabic (Đa ngữ & Ả Rập)",
    translationKey: "fontOptions.notoSans",
  },
  {
    value: "Merriweather, serif",
    label: "Merriweather (Serif Trang trọng)",
    translationKey: "fontOptions.merriweather",
  },
] as const;
