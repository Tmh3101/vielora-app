import React from "react";
import {
  User,
  AlignLeft,
  Table2,
  BarChart3,
  ListChecks,
  ShieldAlert,
  PanelBottom,
} from "lucide-react";
import { SectionType, TemplateSectionConfig } from "@/types";

export const SECTION_TYPE_METADATA: Record<
  SectionType,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultBind?: string;
    defaultTitleI18n?: string;
  }
> = {
  hero: {
    label: "Hero & Thông tin Trợ lý",
    description: "Tiêu đề trang bìa, logo thương hiệu và thông tin nhận diện bot",
    icon: User,
    defaultBind: "botIdentity",
  },
  "text-block": {
    label: "Khối văn bản",
    description: "Đoạn văn bản tóm tắt hoặc nội dung phân tích tổng hợp",
    icon: AlignLeft,
    defaultBind: "summary",
    defaultTitleI18n: "report.summary",
  },
  table: {
    label: "Bảng dữ liệu",
    description: "Bảng so sánh tiến trình, điểm số hoặc danh mục chỉ số",
    icon: Table2,
    defaultBind: "progressTable",
    defaultTitleI18n: "report.progressTable",
  },
  chart: {
    label: "Biểu đồ trực quan",
    description: "Biểu đồ đường (Line), radar năng lực hoặc cột chỉ số",
    icon: BarChart3,
    defaultBind: "topicTrends",
    defaultTitleI18n: "report.topicTrends",
  },
  "summary-list": {
    label: "Danh sách tóm lược",
    description: "Danh sách gạch đầu dòng các chủ đề, thế mạnh hoặc điểm lưu ý",
    icon: ListChecks,
    defaultBind: "keyTopics",
    defaultTitleI18n: "report.keyTopics",
  },
  disclaimer: {
    label: "Quy định miễn trừ",
    description: "Điều khoản pháp lý và bảo lưu trách nhiệm bắt buộc",
    icon: ShieldAlert,
    defaultTitleI18n: "report.disclaimer",
  },
  footer: {
    label: "Chân trang",
    description: "Thông tin bản quyền và nhận diện thương hiệu cuối trang",
    icon: PanelBottom,
  },
};

export const SECTION_ALLOWED_BINDS: Record<
  SectionType,
  Array<{ value: string; label: string; defaultTitle?: string }>
> = {
  hero: [{ value: "botIdentity", label: "Định danh Trợ lý AI (Avatar, Tên, Tên miền)" }],
  "text-block": [
    {
      value: "summary",
      label: "Tóm tắt điều hành (Executive Summary do AI phân tích)",
      defaultTitle: "report.summary",
    },
    {
      value: "botSummary",
      label: "Định vị nghiệp vụ & Hồ sơ Trợ lý (Operational Profile)",
      defaultTitle: "report.botSummary",
    },
  ],
  chart: [
    {
      value: "competencyRadar",
      label: "Chỉ số chất lượng tri thức (Biểu đồ Radar 6 trục)",
      defaultTitle: "report.competencyRadar",
    },
    {
      value: "topicTrends",
      label: "Xu hướng hoạt động & tương tác (Biểu đồ Đường thời gian)",
      defaultTitle: "report.topicTrends",
    },
    {
      value: "topicDistribution",
      label: "Phân bổ tài sản tri thức theo chủ đề (Biểu đồ Cột)",
      defaultTitle: "report.topicDistribution",
    },
  ],
  table: [
    {
      value: "progressTable",
      label: "Bảng phân tích phân hệ & Mức độ sẵn sàng",
      defaultTitle: "report.progressTable",
    },
    {
      value: "documentStats",
      label: "Bảng thống kê chi tiết tài liệu",
      defaultTitle: "report.documentMetrics",
    },
  ],
  "summary-list": [
    {
      value: "strengths",
      label: "Danh sách thế mạnh nổi bật (Tick xanh)",
      defaultTitle: "report.strengths",
    },
    {
      value: "needsSupport",
      label: "Khuyến nghị & Lỗ hổng tri thức (Cảnh báo cam)",
      defaultTitle: "report.needsSupport",
    },
    {
      value: "keyTopics",
      label: "Lưới danh mục chủ đề tri thức (Grid thẻ)",
      defaultTitle: "report.keyTopics",
    },
  ],
  disclaimer: [],
  footer: [],
};

export const AVAILABLE_BIND_KEYS = [
  { value: "botIdentity", label: "Định danh & Thông tin Bot" },
  { value: "summary", label: "Tóm tắt điều hành (Executive Summary)" },
  { value: "keyTopics", label: "Danh mục các chủ đề tri thức thực tế" },
  { value: "topicTrends", label: "Xu hướng hoạt động & tương tác" },
  { value: "topicDistribution", label: "Phân bổ tài sản tri thức theo chủ đề" },
  { value: "subjectHeader", label: "Tổng quan phạm vi báo cáo" },
  { value: "competencyRadar", label: "Chỉ số chất lượng tri thức (Knowledge Quality Index)" },
  { value: "progressTable", label: "Bảng phân tích chuyên mục & mức độ sẵn sàng" },
  { value: "strengths", label: "Danh sách thế mạnh nổi bật" },
  { value: "needsSupport", label: "Khuyến nghị bổ sung & Lỗ hổng tri thức (Knowledge Gaps)" },
  { value: "botSummary", label: "Tóm lược năng lực AI Trợ lý" },
  { value: "documentStats", label: "Thống kê chi tiết tài liệu" },
  { value: "exportDate", label: "Ngày giờ xuất bản báo cáo" },
];

export const COMMON_I18N_KEYS = [
  { value: "report.reportTitle", label: "Tiêu đề báo cáo" },
  { value: "report.summary", label: "Tóm tắt tổng quan" },
  { value: "report.executiveSummary", label: "Tóm tắt điều hành" },
  { value: "report.keyTopics", label: "Chủ đề cốt lõi" },
  { value: "report.topicTrends", label: "Xu hướng hoạt động" },
  { value: "report.topicDistribution", label: "Phân bổ tài sản tri thức" },
  { value: "report.scopeHeader", label: "Tổng quan phạm vi báo cáo" },
  { value: "report.competencyRadar", label: "Chỉ số chất lượng tri thức" },
  { value: "report.progressTable", label: "Phân tích phân hệ & Mức độ sẵn sàng" },
  { value: "report.strengths", label: "Thế mạnh nổi bật" },
  { value: "report.needsSupport", label: "Khuyến nghị bổ sung tri thức" },
  { value: "report.botSummary", label: "Tóm lược AI Bot" },
  { value: "report.documentMetrics", label: "Chỉ số tài liệu" },
  { value: "report.disclaimer", label: "Quy định miễn trừ trách nhiệm" },
];

export const AVAILABLE_TABLE_COLUMNS: Record<string, Array<{ key: string; label: string }>> = {
  progressTable: [
    { key: "period", label: "Giai đoạn / Phân hệ" },
    { key: "subject", label: "Chuyên mục / Dịch vụ" },
    { key: "score", label: "Điểm đánh giá" },
    { key: "delta", label: "Mức độ tin cậy" },
  ],
  documentStats: [
    { key: "type", label: "Loại tài liệu" },
    { key: "count", label: "Số lượng" },
    { key: "size", label: "Dung lượng / Ký tự" },
    { key: "lastUpdated", label: "Cập nhật gần nhất" },
  ],
  keyTopics: [
    { key: "topic", label: "Tên chủ đề" },
    { key: "count", label: "Tần suất" },
    { key: "description", label: "Mô tả phạm vi" },
  ],
  default: [
    { key: "period", label: "Giai đoạn / Phân hệ" },
    { key: "subject", label: "Chuyên mục / Dịch vụ" },
    { key: "score", label: "Điểm đánh giá" },
    { key: "delta", label: "Mức độ tin cậy" },
  ],
};

export const DEFAULT_STARTER_SECTIONS: TemplateSectionConfig[] = [
  { id: "sec-hero", type: "hero", bind: "botIdentity", showBranding: true },
  {
    id: "sec-summary",
    type: "text-block",
    bind: "summary",
    titleI18n: "report.summary",
  },
  {
    id: "sec-topics",
    type: "summary-list",
    bind: "keyTopics",
    titleI18n: "report.keyTopics",
  },
  {
    id: "sec-trends",
    type: "chart",
    bind: "topicTrends",
    titleI18n: "report.topicTrends",
    chart: "line",
    options: { colorFromBranding: true },
  },
  {
    id: "sec-disclaimer",
    type: "disclaimer",
    titleI18n: "report.disclaimer",
  },
  { id: "sec-footer", type: "footer", showBranding: true },
];
