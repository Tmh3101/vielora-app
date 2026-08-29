-- ============================================================================
-- Migration: Generic Report Export Schema, Storage Buckets, and RLS
-- Date: 2026-08-18
-- Description: Creates workspace_branding, report_templates, report_exports tables,
--              report_export_status enum, can_export_report column on group_members,
--              storage buckets (workspace-branding public, report-exports private),
--              and associated RLS policies & triggers.
-- ============================================================================

-- 1. workspace_branding (1-1 with workspaces)
CREATE TABLE IF NOT EXISTS public.workspace_branding (
  workspace_id        uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand_name          text,
  logo_url            text,
  primary_color       text NOT NULL DEFAULT '#3B82F6',
  secondary_color     text,
  font_family         text,
  header_text         text,
  footer_text         text,
  watermark_url       text,
  default_language    text NOT NULL DEFAULT 'vi',
  supported_languages text[] NOT NULL DEFAULT '{vi}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2. report_templates
CREATE TABLE IF NOT EXISTS public.report_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key          text NOT NULL,
  name         text NOT NULL,
  version      int NOT NULL DEFAULT 1,
  schema       jsonb NOT NULL,
  languages    text[] NOT NULL DEFAULT '{vi}',
  is_active    boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_templates_workspace_key_version_unique UNIQUE (workspace_id, key, version)
);

-- 3. report_export_status enum
DO $$ BEGIN
  CREATE TYPE public.report_export_status AS ENUM
    ('pending', 'rendering', 'awaiting_review', 'approved', 'issued', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. report_exports
CREATE TABLE IF NOT EXISTS public.report_exports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id   uuid NOT NULL REFERENCES public.report_templates(id),
  bot_id        uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  scope         jsonb NOT NULL DEFAULT '{}',
  requested_by  uuid NOT NULL REFERENCES auth.users(id),
  status        public.report_export_status NOT NULL DEFAULT 'pending',
  language      text NOT NULL DEFAULT 'vi',
  file_path     text,
  error_message text,
  retry_count   int NOT NULL DEFAULT 0,
  reviewed_by   uuid REFERENCES auth.users(id),
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 5. Revoke direct write from authenticated and anon roles (service-role only writes)
REVOKE INSERT, UPDATE, DELETE ON TABLE public.report_exports FROM authenticated, anon;

-- 6. Add can_export_report permission column to group_members (B7)
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS can_export_report boolean NOT NULL DEFAULT false;

-- 7. Performance & lookup indexes
CREATE INDEX IF NOT EXISTS idx_report_templates_workspace_id ON public.report_templates (workspace_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_workspace_id ON public.report_exports (workspace_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_bot_id ON public.report_exports (bot_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_template_id ON public.report_exports (template_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_status ON public.report_exports (status);

-- 8. Triggers for updated_at
DROP TRIGGER IF EXISTS trg_workspace_branding_updated_at ON public.workspace_branding;
CREATE TRIGGER trg_workspace_branding_updated_at
  BEFORE UPDATE ON public.workspace_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_report_templates_updated_at ON public.report_templates;
CREATE TRIGGER trg_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_report_exports_updated_at ON public.report_exports;
CREATE TRIGGER trg_report_exports_updated_at
  BEFORE UPDATE ON public.report_exports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Storage buckets
-- workspace-branding: public bucket for brand logos, avatars, watermarks (max 2MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-branding',
  'workspace-branding',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- report-exports: private bucket for generated PDF reports containing PII (max 20MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-exports',
  'report-exports',
  false,
  20971520,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.workspace_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

-- RLS: workspace_branding
DROP POLICY IF EXISTS "workspace_branding_member_select" ON public.workspace_branding;
CREATE POLICY "workspace_branding_member_select" ON public.workspace_branding FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspace_branding.workspace_id
      AND workspace_members.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "workspace_branding_admin_write" ON public.workspace_branding;
CREATE POLICY "workspace_branding_admin_write" ON public.workspace_branding FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.workspace_roles wr ON wr.id = wm.role_id
    WHERE wm.workspace_id = workspace_branding.workspace_id
      AND wm.user_id = auth.uid()
      AND wr.hierarchy >= 80
  ));

-- RLS: report_templates
DROP POLICY IF EXISTS "report_templates_member_select" ON public.report_templates;
CREATE POLICY "report_templates_member_select" ON public.report_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = report_templates.workspace_id
      AND workspace_members.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "report_templates_admin_write" ON public.report_templates;
CREATE POLICY "report_templates_admin_write" ON public.report_templates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.workspace_roles wr ON wr.id = wm.role_id
    WHERE wm.workspace_id = report_templates.workspace_id
      AND wm.user_id = auth.uid()
      AND wr.hierarchy >= 80
  ));

-- RLS: report_exports (service-role only writes; members can select their workspace's)
DROP POLICY IF EXISTS "report_exports_member_select" ON public.report_exports;
CREATE POLICY "report_exports_member_select" ON public.report_exports FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = report_exports.workspace_id
      AND workspace_members.user_id = auth.uid()
  ));

-- Storage RLS: workspace-branding (public read access)
DROP POLICY IF EXISTS "Public read access for workspace branding" ON storage.objects;
CREATE POLICY "Public read access for workspace branding"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'workspace-branding');
