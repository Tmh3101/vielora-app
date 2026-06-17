-- ============================================================================
-- DEPLOYMENT MIGRATION: Sync Production (vielora-prod) with Staging Changes
-- ============================================================================
-- Applied to:  gckcimbcyztzswkqainp (vielora-prod)
-- Source:      supabase/migrations/ files + db-schema.sql (synced from staging)
-- Date:        2026-06-17
-- ============================================================================
-- INSTRUCTIONS:
--   1. Backup the database first (Supabase Dashboard > Database > Backups)
--   2. Run this migration via Supabase SQL Editor or psql
--   3. Run supabase/migrations/20260617_sync_changes_from_staging.sql next
--   4. Verify all tables, functions, and policies
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: SCHEMA CHANGES
-- ============================================================================

-- 1a. Add allowed_domains column to bots table (with check constraint)
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS allowed_domains text[] NOT NULL DEFAULT '{}'::text[];

-- Add CHECK constraint for max 5 domains (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bots_allowed_domains_max_5'
      AND conrelid = 'public.bots'::regclass
  ) THEN
    ALTER TABLE public.bots
      ADD CONSTRAINT bots_allowed_domains_max_5
      CHECK (cardinality(allowed_domains) <= 5);
  END IF;
END $$;

-- 1b. Create blog tables (categories, posts, post_categories)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_name_key UNIQUE (name),
  CONSTRAINT categories_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  summary text NOT NULL,
  thumbnail_url text NULL,
  content text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  published_at timestamptz NULL,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_slug_key UNIQUE (slug),
  CONSTRAINT posts_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text]))
);

CREATE TABLE IF NOT EXISTS public.post_categories (
  post_id uuid NOT NULL,
  category_id uuid NOT NULL,
  CONSTRAINT post_categories_pkey PRIMARY KEY (post_id, category_id),
  CONSTRAINT post_categories_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
  CONSTRAINT post_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE
);

-- Trigger for posts updated_at
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1c. Create Shopify session tables
CREATE TABLE IF NOT EXISTS public.shopify_sessions_migrations (
  migration_name varchar NOT NULL,
  CONSTRAINT shopify_sessions_migrations_pkey PRIMARY KEY (migration_name)
);

CREATE TABLE IF NOT EXISTS public.shopify_sessions (
  id varchar NOT NULL,
  shop varchar NOT NULL,
  state varchar NOT NULL,
  "isOnline" bool NOT NULL,
  scope varchar NULL,
  expires int4 NULL,
  "accessToken" varchar NULL,
  "refreshToken" varchar NULL,
  "refreshTokenExpires" int8 NULL,
  "userId" int8 NULL,
  "firstName" varchar NULL,
  "lastName" varchar NULL,
  email varchar NULL,
  "accountOwner" bool NULL,
  locale varchar NULL,
  collaborator bool NULL,
  "emailVerified" bool NULL,
  CONSTRAINT shopify_sessions_pkey PRIMARY KEY (id)
);

-- 1d. Enable RLS on new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_sessions_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: FUNCTIONS
-- ============================================================================

-- 2a. Create get_user_id_by_email helper function
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT id
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
$$;

-- 2b. Update hybrid_search to include source_type and resolved_url
-- Must DROP first because return type (OUT params) changed — CREATE OR REPLACE cannot alter return type
DROP FUNCTION IF EXISTS public.hybrid_search(text, vector, integer, double precision, double precision, uuid);
CREATE OR REPLACE FUNCTION public.hybrid_search(
  query_text text,
  query_embedding vector,
  match_count integer DEFAULT 5,
  full_text_weight double precision DEFAULT 1.0,
  semantic_weight double precision DEFAULT 1.0,
  p_bot_id uuid DEFAULT NULL::uuid
) RETURNS TABLE(
  id uuid,
  bot_id uuid,
  content text,
  metadata jsonb,
  similarity double precision,
  source_type text,
  resolved_url text
) LANGUAGE plpgsql
AS $function$
declare
  rrf_k constant integer := 60;
begin
  return query
  with full_text_results as (
    select
      d.id,
      row_number() over (order by ts_rank_cd(d.fts, plainto_tsquery('simple', query_text)) desc) as rank_ix
    from public.documents d
    where
      (p_bot_id is null or d.bot_id = p_bot_id)
      and d.fts @@ plainto_tsquery('simple', query_text)
    limit 20
  ),
  semantic_results as (
    select
      d.id,
      row_number() over (order by d.embedding <=> query_embedding) as rank_ix
    from public.documents d
    where
      (p_bot_id is null or d.bot_id = p_bot_id)
      and d.embedding is not null
    limit 20
  ),
  rrf_results as (
    select
      coalesce(ft.id, sem.id) as id,
      (
        coalesce(full_text_weight * (1.0 / (rrf_k + ft.rank_ix)), 0.0) +
        coalesce(semantic_weight * (1.0 / (rrf_k + sem.rank_ix)), 0.0)
      ) as rrf_score
    from full_text_results ft
    full outer join semantic_results sem on ft.id = sem.id
  ),
  top_matches as (
    select
      rrf.id,
      rrf.rrf_score
    from rrf_results rrf
    order by rrf.rrf_score desc
    limit match_count
  )
  select
    d.id,
    d.bot_id,
    d.content,
    d.metadata,
    tm.rrf_score as similarity,
    coalesce(p.source_type, 'website') as source_type,
    p.url as resolved_url
  from top_matches tm
  join public.documents d on d.id = tm.id
  left join public.pages p on d.bot_id = p.bot_id and (d.metadata->>'url') = p.url;
end;
$function$;

-- ============================================================================
-- PART 3: RLS POLICIES
-- ============================================================================

-- 3a. Drop duplicate credit_packages policy
DROP POLICY IF EXISTS "credit_packages_select_active" ON public.credit_packages;

-- 3b. Public PWA branding: anonymous users can read public bot metadata
DROP POLICY IF EXISTS "bots_select_public_pwa_branding" ON public.bots;
CREATE POLICY "bots_select_public_pwa_branding"
  ON public.bots FOR SELECT
  TO anon
  USING (is_public = true AND slug IS NOT NULL);

REVOKE SELECT ON TABLE public.bots FROM anon;
GRANT SELECT (slug, name, widget_settings, avatar_url) ON TABLE public.bots TO anon;

-- 3c. Blog RLS policies (Public Read + Service Role)
CREATE POLICY "Allow public read categories" ON public.categories
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow service role all operations on categories" ON public.categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read published posts" ON public.posts
  FOR SELECT TO public USING (status = 'published'::text);
CREATE POLICY "Allow service role all operations on posts" ON public.posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read post_categories" ON public.post_categories
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow service role all operations on post_categories" ON public.post_categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3d. Shopify tables RLS (service_role only)
CREATE POLICY "Allow service role all operations" ON public.shopify_sessions_migrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role all operations" ON public.shopify_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 4: STORAGE (thumbnails bucket)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('thumbnails', 'thumbnails', true, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'thumbnails');

-- ============================================================================
-- PART 5: INDEXES (for new tables)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts (slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts (status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts (published_at DESC);

COMMIT;

-- Sync local files with changes found on Supabase staging project
-- These changes were applied directly on Supabase and were missing from local SQL files.

-- 1. Helper function to look up user ID by email (used by admin APIs)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT id 
  FROM auth.users 
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
$$;

-- 2. Trigger to notify admin app when a new support ticket is created
--    Uses the built-in supabase_functions.http_request (powered by pg_net extension)
DROP TRIGGER IF EXISTS send_ticket_notification ON public.support_tickets;
CREATE TRIGGER send_ticket_notification
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://admin-portal.vielora.vn/api/webhooks/support-ticket',
    'POST',
    '{"Authorization":"Bearer <your_webhook_secret>"}',
    '{}',
    '5000'
  );
