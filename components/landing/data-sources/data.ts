import { Globe, Newspaper, FileText, FileCode, Table } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DataSource {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

export const DIGITAL_SOURCES: DataSource[] = [
  {
    id: "website",
    label: "Website",
    icon: Globe,
    color: "hsl(217, 91%, 60%)",
    description: "Thu thập nội dung tự động từ website",
  },
  {
    id: "blog",
    label: "Blog",
    icon: FileText,
    color: "hsl(142, 76%, 36%)",
    description: "Phân tích bài viết, media & metadata",
  },
  {
    id: "news",
    label: "News",
    icon: Newspaper,
    color: "hsl(199, 89%, 48%)",
    description: "Tổng hợp tin tức từ nhiều nguồn",
  },
];

export const DOCUMENT_SOURCES: DataSource[] = [
  {
    id: "pdf",
    label: "PDF",
    icon: FileText,
    color: "#ef4444",
    description: "Hỗ trợ OCR, bảng biểu & hình ảnh",
  },
  {
    id: "docx",
    label: "Word",
    icon: FileText,
    color: "#3b82f6",
    description: "Đọc văn bản, heading & danh sách",
  },
  {
    id: "md",
    label: "Markdown",
    icon: FileCode,
    color: "#a855f7",
    description: "Xử lý Markdown, code block & front matter",
  },
  {
    id: "csv",
    label: "CSV",
    icon: Table,
    color: "#22c55e",
    description: "Nhập dữ liệu có cấu trúc & bảng tính",
  },
  {
    id: "txt",
    label: "TXT",
    icon: FileText,
    color: "#6b7280",
    description: "Đọc văn bản thuần & chuẩn hóa encoding",
  },
];

export const ALL_SOURCES: DataSource[] = [...DIGITAL_SOURCES, ...DOCUMENT_SOURCES];
export const SOURCE_IDS = ALL_SOURCES.map((s) => s.id);
