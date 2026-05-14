-- Fix Storage RLS policies scoping issue
-- The previous policies used foldername(name) inside EXISTS (SELECT 1 FROM bots ...),
-- which caused 'name' to resolve to 'bots.name' instead of 'storage.objects.name'.

-- 1. Ensure all buckets exist with correct public status and limits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('bot-avatars', 'bot-avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('widget-backgrounds', 'widget-backgrounds', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('widget-icons', 'widget-icons', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('knowledge_files', 'knowledge_files', false, 10485760, NULL)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Bot Avatars Policies
DROP POLICY IF EXISTS "Authenticated users can upload bot avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload bot avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bot-avatars' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update bot avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update bot avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bot-avatars' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete bot avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete bot avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bot-avatars' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public read access for bot avatars" ON storage.objects;
CREATE POLICY "Public read access for bot avatars"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'bot-avatars');

-- 3. Widget Backgrounds Policies
DROP POLICY IF EXISTS "Authenticated users can upload widget backgrounds" ON storage.objects;
CREATE POLICY "Authenticated users can upload widget backgrounds"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'widget-backgrounds' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update widget backgrounds" ON storage.objects;
CREATE POLICY "Authenticated users can update widget backgrounds"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'widget-backgrounds' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete widget backgrounds" ON storage.objects;
CREATE POLICY "Authenticated users can delete widget backgrounds"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'widget-backgrounds' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public read access for widget backgrounds" ON storage.objects;
CREATE POLICY "Public read access for widget backgrounds"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'widget-backgrounds');

-- 4. Widget Icons Policies
DROP POLICY IF EXISTS "Authenticated users can upload widget icons" ON storage.objects;
CREATE POLICY "Authenticated users can upload widget icons"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'widget-icons' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update widget icons" ON storage.objects;
CREATE POLICY "Authenticated users can update widget icons"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'widget-icons' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete widget icons" ON storage.objects;
CREATE POLICY "Authenticated users can delete widget icons"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'widget-icons' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public read access for widget icons" ON storage.objects;
CREATE POLICY "Public read access for widget icons"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'widget-icons');

-- 5. Knowledge Files Policies
DROP POLICY IF EXISTS "Authenticated users can upload knowledge files" ON storage.objects;
CREATE POLICY "Authenticated users can upload knowledge files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'knowledge_files' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read knowledge files" ON storage.objects;
CREATE POLICY "Authenticated users can read knowledge files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'knowledge_files' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update knowledge files" ON storage.objects;
CREATE POLICY "Authenticated users can update knowledge files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'knowledge_files' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete knowledge files" ON storage.objects;
CREATE POLICY "Authenticated users can delete knowledge files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'knowledge_files' AND split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid()));
