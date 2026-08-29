-- ============================================================================
-- Seed: Logic Hub Report Template & Workspace Branding
-- Task: 3-1 Logic Hub Adapter (Phase 3)
-- Customer: Logic Hub (logichub.vn)
--
-- Instructions:
-- Replace '00000000-0000-0000-0000-000000000002' with the real Logic Hub workspace_id
-- before running in target environment.
-- DO NOT auto-run in migrations pipeline.
-- ============================================================================

-- 1. Workspace Branding for Logic Hub
-- REPLACE '00000000-0000-0000-0000-000000000002' with real Logic Hub workspace_id
INSERT INTO public.workspace_branding (
  workspace_id,
  brand_name,
  logo_url,
  primary_color,
  secondary_color,
  font_family,
  header_text,
  footer_text,
  watermark_url,
  default_language,
  supported_languages
)
VALUES (
  '00000000-0000-0000-0000-000000000002', -- REPLACE with real Logic Hub workspace_id
  'Logic Hub',
  'https://logichub.vn/assets/logo.png',
  '#6366F1',
  '#06B6D4',
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  'Báo cáo Phân tích Tri thức & Vận hành Hệ thống Logic Hub',
  'Logic Hub · Nền tảng Tối ưu Tri thức & Tự động hoá Doanh nghiệp',
  NULL,
  'vi',
  '{vi,en}'
)
ON CONFLICT (workspace_id) DO UPDATE SET
  brand_name = EXCLUDED.brand_name,
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  font_family = EXCLUDED.font_family,
  header_text = EXCLUDED.header_text,
  footer_text = EXCLUDED.footer_text,
  default_language = EXCLUDED.default_language,
  supported_languages = EXCLUDED.supported_languages;

-- 2. Report Template for Logic Hub
-- REPLACE '00000000-0000-0000-0000-000000000002' with real Logic Hub workspace_id
INSERT INTO public.report_templates (
  workspace_id,
  key,
  name,
  version,
  schema,
  languages,
  is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000002', -- REPLACE with real Logic Hub workspace_id
  'logic-hub-report',
  'Logic Hub Report',
  1,
  '{
    "title": "Logic Hub Knowledge & Operations Report",
    "description": "Comprehensive document analytics, topic clusters, and knowledge base readiness assessment for Logic Hub AI assistants.",
    "sections": [
      {
        "id": "header",
        "type": "branding_header",
        "bind": ["botIdentity", "exportDate"]
      },
      {
        "id": "executive_summary",
        "type": "summary_card",
        "titleKey": "report.executiveSummary",
        "bind": "summary"
      },
      {
        "id": "document_metrics",
        "type": "stat_grid",
        "titleKey": "report.documentMetrics",
        "bind": "documentStats"
      },
      {
        "id": "topic_clusters",
        "type": "cluster_grid",
        "titleKey": "report.topicClusters",
        "bind": "topicClusters"
      },
      {
        "id": "knowledge_distribution",
        "type": "bar_chart",
        "titleKey": "report.knowledgeDistribution",
        "bind": "knowledgeDistribution"
      },
      {
        "id": "system_readiness",
        "type": "score_table",
        "titleKey": "report.systemReadiness",
        "bind": "systemReadiness"
      },
      {
        "id": "disclaimer",
        "type": "disclaimer_banner",
        "titleKey": "report.disclaimer"
      }
    ]
  }'::jsonb,
  '{vi,en}',
  true
)
ON CONFLICT (workspace_id, key, version) DO UPDATE SET
  name = EXCLUDED.name,
  schema = EXCLUDED.schema,
  languages = EXCLUDED.languages,
  is_active = EXCLUDED.is_active;
