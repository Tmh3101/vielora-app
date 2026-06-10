-- Add widget embed allowlist to bots.
ALTER TABLE public.bots
ADD COLUMN IF NOT EXISTS allowed_domains text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.bots
SET allowed_domains = ARRAY[
  regexp_replace(
    regexp_replace(
      regexp_replace(lower(trim(domain)), '^https?://', ''),
      '^www\.',
      ''
    ),
    '[:/].*$',
    ''
  )
]
WHERE cardinality(allowed_domains) = 0
  AND domain IS NOT NULL
  AND length(trim(domain)) > 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bots_allowed_domains_max_5'
  ) THEN
    ALTER TABLE public.bots
    ADD CONSTRAINT bots_allowed_domains_max_5 CHECK (cardinality(allowed_domains) <= 5);
  END IF;
END $$;

COMMENT ON COLUMN public.bots.allowed_domains IS 'Domains allowed to embed this bot widget. Maximum 5 normalized hostnames.';
