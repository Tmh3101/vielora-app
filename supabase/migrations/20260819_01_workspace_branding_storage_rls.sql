-- Storage RLS & bucket initialization for workspace-branding
-- Bucket for brand logos, avatars, watermarks (public read, authenticated admin write)

-- 1. Ensure bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-branding',
  'workspace-branding',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage RLS policies
DROP POLICY IF EXISTS "Public read access for workspace branding" ON storage.objects;
CREATE POLICY "Public read access for workspace branding"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'workspace-branding');

DROP POLICY IF EXISTS "Workspace admins can upload branding assets" ON storage.objects;
CREATE POLICY "Workspace admins can upload branding assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'workspace-branding'
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.workspace_roles wr ON wr.id = wm.role_id
      WHERE wm.workspace_id = split_part(name, '/', 1)::uuid
        AND wm.user_id = auth.uid()
        AND wr.hierarchy >= 80
    )
  );

DROP POLICY IF EXISTS "Workspace admins can update branding assets" ON storage.objects;
CREATE POLICY "Workspace admins can update branding assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'workspace-branding'
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.workspace_roles wr ON wr.id = wm.role_id
      WHERE wm.workspace_id = split_part(name, '/', 1)::uuid
        AND wm.user_id = auth.uid()
        AND wr.hierarchy >= 80
    )
  );

DROP POLICY IF EXISTS "Workspace admins can delete branding assets" ON storage.objects;
CREATE POLICY "Workspace admins can delete branding assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'workspace-branding'
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.workspace_roles wr ON wr.id = wm.role_id
      WHERE wm.workspace_id = split_part(name, '/', 1)::uuid
        AND wm.user_id = auth.uid()
        AND wr.hierarchy >= 80
    )
  );
