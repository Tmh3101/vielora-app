-- Add slug and is_public columns to bots table
ALTER TABLE public.bots 
ADD COLUMN slug TEXT UNIQUE,
ADD COLUMN is_public BOOLEAN DEFAULT false NOT NULL;

-- Create index for slug lookups
CREATE INDEX idx_bots_slug ON public.bots(slug) WHERE slug IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.bots.slug IS 'URL-friendly unique identifier for standalone chat page';
COMMENT ON COLUMN public.bots.is_public IS 'Whether the bot is accessible via public standalone link';
