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