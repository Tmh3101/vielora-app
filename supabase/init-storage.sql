-- Create public storage bucket for bot avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bot-avatars',
  'bot-avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload bot avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bot-avatars');

-- Allow authenticated users to update/delete their own avatars
CREATE POLICY "Authenticated users can update bot avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'bot-avatars');

CREATE POLICY "Authenticated users can delete bot avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'bot-avatars');

-- Allow public read access
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
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload widget backgrounds"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'widget-backgrounds');

-- Allow authenticated users to update/delete their own widget backgrounds
CREATE POLICY "Authenticated users can update widget backgrounds"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'widget-backgrounds');

CREATE POLICY "Authenticated users can delete widget backgrounds"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'widget-backgrounds');

-- Allow public read access
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
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload widget icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'widget-icons');

-- Allow authenticated users to update/delete their own widget icons
CREATE POLICY "Authenticated users can update widget icons"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'widget-icons');

CREATE POLICY "Authenticated users can delete widget icons"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'widget-icons');

-- Allow public read access
CREATE POLICY "Public read access for widget icons"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'widget-icons');