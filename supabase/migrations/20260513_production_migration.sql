-- SUPABASE PRODUCTION MIGRATION SCRIPT
-- Project ID: gckcimbcyztzswkqainp
-- Generated on: 2026-05-13

-- ================================================================================
-- 1. EXTENSIONS & TYPES
-- ================================================================================

-- Extension vector already exists, but ensure it's in public
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Update ENUM types with missing values
ALTER TYPE public.page_error_type ADD VALUE IF NOT EXISTS 'not_found';

ALTER TYPE public.payment_type ADD VALUE IF NOT EXISTS 'subscription_upgrade';
ALTER TYPE public.payment_type ADD VALUE IF NOT EXISTS 'subscription_renew';

ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'index_pages_refund';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'chat_message_refund';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'add_knowledge_refund';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'update_knowledge_refund';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'payg_purchase';

-- ================================================================================
-- 2. TABLES & COLUMNS
-- ================================================================================

-- Update public.bots
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS avatar_url text NULL; -- Already exists in prod but added for safety
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS rate_limit_per_day int4 NULL; -- Already exists
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS rate_limit_per_ip int4 NULL; -- Already exists
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS is_stopped boolean NOT NULL DEFAULT false; -- Already exists
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS slug text NULL;
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Add unique constraint for slug if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bots_slug_key') THEN
        ALTER TABLE public.bots ADD CONSTRAINT bots_slug_key UNIQUE (slug);
    END IF;
END $$;

-- Update public.pages source_type check constraint
ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_source_type_check;
ALTER TABLE public.pages ADD CONSTRAINT pages_source_type_check CHECK (source_type IN ('website', 'manual_text', 'file'));

-- Create public.credit_packages
CREATE TABLE IF NOT EXISTS public.credit_packages (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	name text NOT NULL,
	credits_amount int4 NOT NULL,
	price int4 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT credit_packages_pkey PRIMARY KEY (id)
);

-- ================================================================================
-- 3. DATA SYNC (PLANS)
-- ================================================================================

INSERT INTO public.plans (code, name, bots_limit, monthly_credits, description, pricing, is_active)
VALUES
  (
    'free', 'Free', 1, 100, 'Starter plan for new users',
    '{"VND": {"monthly": 0, "yearly": 0}, "USD": {"monthly": 0, "yearly": 0}}'::jsonb,
    true
  ),
  (
    'standard', 'Standard', 2, 1000, 'Balanced plan for growing teams',
    '{"VND": {"monthly": 149000, "yearly": 1490000}, "USD": {"monthly": 9, "yearly": 90}}'::jsonb,
    true
  ),
  (
    'pro', 'Pro', 5, 10000, 'Advanced plan for high-usage teams',
    '{"VND": {"monthly": 499000, "yearly": 4990000}, "USD": {"monthly": 29, "yearly": 290}}'::jsonb,
    true
  )
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  bots_limit = EXCLUDED.bots_limit,
  monthly_credits = EXCLUDED.monthly_credits,
  description = EXCLUDED.description,
  pricing = EXCLUDED.pricing,
  is_active = EXCLUDED.is_active;

-- ================================================================================
-- 4. FUNCTIONS & TRIGGERS
-- ================================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_free_plan_id uuid;
  v_monthly_credits int4;
BEGIN
  SELECT id, monthly_credits
  INTO v_free_plan_id, v_monthly_credits
  FROM public.plans
  WHERE code = 'free'
  LIMIT 1;

  IF v_free_plan_id IS NULL THEN
    RAISE EXCEPTION 'Missing required plan: free';
  END IF;

  INSERT INTO public.subscriptions (user_id, plan_id, billing_cycle, status, current_period_start, current_period_end, next_credit_reset_at)
  VALUES (NEW.id, v_free_plan_id, 'monthly', 'active', now(), now() + '1 mon'::interval, now() + '1 mon'::interval);

  INSERT INTO public.wallets (user_id, subscription_credits, payg_credits, is_payg_enabled)
  VALUES (NEW.id, v_monthly_credits, 0, false);

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
  VALUES (
    NEW.id,
    v_monthly_credits,
    'subscription_renewal',
    format('Initial %s credits granted for free plan', v_monthly_credits)
  );

  RETURN NEW;
END;
$function$;

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
  similarity double precision
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
  )
  select
    d.id,
    d.bot_id,
    d.content,
    d.metadata,
    rrf.rrf_score as similarity
  from rrf_results rrf
  join public.documents d on d.id = rrf.id
  order by rrf.rrf_score desc
  limit match_count;
end;
$function$;

-- Update Triggers for credit_packages
DROP TRIGGER IF EXISTS update_credit_packages_updated_at ON public.credit_packages;
CREATE TRIGGER update_credit_packages_updated_at BEFORE UPDATE ON public.credit_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================================
-- 5. INDICES
-- ================================================================================

CREATE INDEX IF NOT EXISTS idx_bots_rate_limits ON public.bots (id, rate_limit_per_day, rate_limit_per_ip);
CREATE INDEX IF NOT EXISTS idx_bots_slug ON public.bots (slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pages_bot_id_url_unique ON public.pages (bot_id, url);
CREATE INDEX IF NOT EXISTS idx_pages_bot_status ON public.pages (bot_id, status);
CREATE INDEX IF NOT EXISTS idx_pages_bot_error_type ON public.pages (bot_id, error_type);
CREATE INDEX IF NOT EXISTS idx_pages_bot_crawled_at_desc ON public.pages (bot_id, crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_source_type ON public.pages (source_type);
CREATE INDEX IF NOT EXISTS idx_pages_bot_id_source_type ON public.pages (bot_id, source_type);

CREATE INDEX IF NOT EXISTS idx_usage_logs_bot_visitor_action_created ON public.usage_logs (bot_id, visitor_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_bot_ip_action_created ON public.usage_logs (bot_id, client_ip, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_plan_id ON public.payments (plan_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created_at ON public.credit_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_type_created_at ON public.credit_transactions (user_id, transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_payment_id ON public.credit_transactions (payment_id);

CREATE INDEX IF NOT EXISTS idx_jobs_bot_id     ON public.jobs (bot_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status     ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_name       ON public.jobs (name);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs (created_at DESC);

-- ================================================================================
-- 6. RLS POLICIES
-- ================================================================================

-- Enable RLS on new table
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- Clean up and re-apply credit_packages policy
DROP POLICY IF EXISTS "credit_packages_select_active" ON public.credit_packages;
CREATE POLICY "credit_packages_select_active" ON public.credit_packages FOR SELECT USING (is_active = true);

-- Realtime for bots
-- Ensure table is in publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'bots'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bots;
    END IF;
END $$;

-- ================================================================================
-- 7. STORAGE BUCKETS & POLICIES
-- ================================================================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
('widget-backgrounds', 'widget-backgrounds', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
('widget-icons', 'widget-icons', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
('knowledge_files', 'knowledge_files', false, 10485760, NULL)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 7.1 Bot Avatars Policies (Update to ensure ownership check)
DROP POLICY IF EXISTS "Authenticated users can upload bot avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload bot avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bot-avatars' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can update bot avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update bot avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bot-avatars' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can delete bot avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete bot avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bot-avatars' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

-- 7.2 Widget Backgrounds Policies
DROP POLICY IF EXISTS "Authenticated users can upload widget backgrounds" ON storage.objects;
CREATE POLICY "Authenticated users can upload widget backgrounds"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'widget-backgrounds' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can update widget backgrounds" ON storage.objects;
CREATE POLICY "Authenticated users can update widget backgrounds"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'widget-backgrounds' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can delete widget backgrounds" ON storage.objects;
CREATE POLICY "Authenticated users can delete widget backgrounds"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'widget-backgrounds' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

DROP POLICY IF EXISTS "Public read access for widget backgrounds" ON storage.objects;
CREATE POLICY "Public read access for widget backgrounds"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'widget-backgrounds');

-- 7.3 Widget Icons Policies
DROP POLICY IF EXISTS "Authenticated users can upload widget icons" ON storage.objects;
CREATE POLICY "Authenticated users can upload widget icons"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'widget-icons' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can update widget icons" ON storage.objects;
CREATE POLICY "Authenticated users can update widget icons"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'widget-icons' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can delete widget icons" ON storage.objects;
CREATE POLICY "Authenticated users can delete widget icons"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'widget-icons' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

DROP POLICY IF EXISTS "Public read access for widget icons" ON storage.objects;
CREATE POLICY "Public read access for widget icons"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'widget-icons');

-- 7.4 Knowledge Files Policies
DROP POLICY IF EXISTS "Authenticated users can upload knowledge files" ON storage.objects;
CREATE POLICY "Authenticated users can upload knowledge files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'knowledge_files' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can read knowledge files" ON storage.objects;
CREATE POLICY "Authenticated users can read knowledge files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'knowledge_files' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can update knowledge files" ON storage.objects;
CREATE POLICY "Authenticated users can update knowledge files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'knowledge_files' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can delete knowledge files" ON storage.objects;
CREATE POLICY "Authenticated users can delete knowledge files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'knowledge_files' AND (EXISTS (SELECT 1 FROM public.bots WHERE bots.id::text = (storage.foldername(name))[1] AND bots.user_id = auth.uid())));
