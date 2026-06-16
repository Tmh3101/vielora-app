-- Allow anonymous PWA manifest reads for public bot branding only.
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bots_select_public_pwa_branding" ON public.bots;

CREATE POLICY "bots_select_public_pwa_branding"
  ON public.bots
  FOR SELECT
  TO anon
  USING (is_public = true AND slug IS NOT NULL);

REVOKE SELECT ON TABLE public.bots FROM anon;
GRANT SELECT (slug, name, widget_settings, avatar_url) ON TABLE public.bots TO anon;
