-- Create public storage bucket for bot avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bot-avatars',
  'bot-avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users to upload bot avatars only to their own bot folders
CREATE POLICY "Authenticated users can upload bot avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bot-avatars' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow authenticated users to update bot avatars only if they own the bot
CREATE POLICY "Authenticated users can update bot avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bot-avatars' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow authenticated users to delete bot avatars only if they own the bot
CREATE POLICY "Authenticated users can delete bot avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bot-avatars' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow public read access for bot avatars (needed for display in widget)
CREATE POLICY "Public read access for bot avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'bot-avatars');


-- Create public storage bucket for widget backgrounds
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'widget-backgrounds',
  'widget-backgrounds',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users to upload widget backgrounds only to their own bot folders
CREATE POLICY "Authenticated users can upload widget backgrounds"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'widget-backgrounds' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow authenticated users to update widget backgrounds only if they own the bot
CREATE POLICY "Authenticated users can update widget backgrounds"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'widget-backgrounds' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow authenticated users to delete widget backgrounds only if they own the bot
CREATE POLICY "Authenticated users can delete widget backgrounds"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'widget-backgrounds' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow public read access for widget backgrounds
CREATE POLICY "Public read access for widget backgrounds"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'widget-backgrounds');


-- Create public storage bucket for widget icons
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'widget-icons',
  'widget-icons',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users to upload widget icons only to their own bot folders
CREATE POLICY "Authenticated users can upload widget icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'widget-icons' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow authenticated users to update widget icons only if they own the bot
CREATE POLICY "Authenticated users can update widget icons"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'widget-icons' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow authenticated users to delete widget icons only if they own the bot
CREATE POLICY "Authenticated users can delete widget icons"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'widget-icons' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow public read access for widget icons
CREATE POLICY "Public read access for widget icons"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'widget-icons');


-- Create private storage bucket for knowledge files
-- Set public to false to prevent unauthorized direct access via URL
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge_files',
  'knowledge_files',
  false,
  10485760, -- 10 MB
  NULL
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Allow authenticated users to upload knowledge files only to their own bot folders
CREATE POLICY "Authenticated users can upload knowledge files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'knowledge_files' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow authenticated users to read knowledge files only if they own the bot
CREATE POLICY "Authenticated users can read knowledge files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'knowledge_files' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow authenticated users to update knowledge files only if they own the bot
CREATE POLICY "Authenticated users can update knowledge files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'knowledge_files' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );

-- Allow authenticated users to delete knowledge files only if they own the bot
CREATE POLICY "Authenticated users can delete knowledge files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'knowledge_files' AND 
    split_part(name, '/', 1) IN (SELECT id::text FROM public.bots WHERE user_id = auth.uid())
  );
