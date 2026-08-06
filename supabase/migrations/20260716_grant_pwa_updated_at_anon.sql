-- Grant anon permission to read pwa_updated_at column (needed for PWA versioning)
GRANT SELECT (pwa_updated_at) ON TABLE public.bots TO anon;
