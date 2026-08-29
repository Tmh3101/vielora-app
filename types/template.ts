export type SectionType =
  | "hero"
  | "text-block"
  | "table"
  | "chart"
  | "summary-list"
  | "disclaimer"
  | "footer";

export interface TemplateSectionConfig {
  id: string;
  type: SectionType | string;
  bind?: string;
  titleI18n?: string;
  titleKey?: string;
  showBranding?: boolean;
  chart?: "line" | "radar" | "bar" | string;
  options?: {
    chart?: string;
    columns?: string[];
    highlightDelta?: boolean;
    colorFromBranding?: boolean;
    max?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ReportTemplateItem {
  id: string;
  workspace_id: string;
  key: string;
  name: string;
  version: number;
  prompt_directive?: string | null;
  schema: {
    title?: string;
    description?: string;
    prompt_directive?: string | null;
    sections: TemplateSectionConfig[];
    [key: string]: unknown;
  };
  languages: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateEditorTabProps {
  workspaceId: string;
  isOwnerOrAdmin: boolean;
}
