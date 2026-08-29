-- ============================================================================
-- Migration: Add prompt_directive to report_templates
-- Date: 2026-08-25
-- Description: Column exists on staging but was missing from migration history.
--              Used by AI report generation to inject workspace-level prompt
--              guidance (referenced by app/api/workspaces/[id]/templates).
-- ============================================================================

ALTER TABLE public.report_templates
  ADD COLUMN IF NOT EXISTS prompt_directive text;

COMMENT ON COLUMN public.report_templates.prompt_directive IS
  'Optional AI prompt guidance injected during report generation.';
