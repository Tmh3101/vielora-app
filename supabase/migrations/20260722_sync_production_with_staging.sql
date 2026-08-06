-- Migration: Sync production with staging
-- This migration adds all missing tables, columns, indexes, triggers, and RLS policies
-- to production database to match the staging environment

-- ============================================================
-- 1. CREATE MISSING ENUM TYPES
-- ============================================================

DO $$ BEGIN
    CREATE TYPE public.invoice_status AS ENUM ('pending', 'issuing', 'issued', 'failed', 'cancelled', 'replaced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.invoice_provider AS ENUM ('easyinvoice', 'misa_meinvoice');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 2. CREATE MISSING TABLES (before adding FK constraints)
-- ============================================================

-- ai_personalities table
CREATE TABLE IF NOT EXISTS public.ai_personalities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name varchar NOT NULL,
    description text NULL,
    prompt_injection text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT ai_personalities_pkey PRIMARY KEY (id),
    CONSTRAINT ai_personalities_name_key UNIQUE (name)
);

-- ai_skills table
CREATE TABLE IF NOT EXISTS public.ai_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name varchar NOT NULL,
    description text NULL,
    prompt_injection text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT ai_skills_pkey PRIMARY KEY (id),
    CONSTRAINT ai_skills_name_key UNIQUE (name)
);

-- bot_skills table
CREATE TABLE IF NOT EXISTS public.bot_skills (
    bot_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    sort_order smallint DEFAULT 0 NOT NULL,
    CONSTRAINT bot_skills_pkey PRIMARY KEY (bot_id, skill_id),
    CONSTRAINT bot_skills_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE,
    CONSTRAINT bot_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.ai_skills(id) ON DELETE CASCADE
);

-- bot_leads table
CREATE TABLE IF NOT EXISTS public.bot_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bot_id uuid NOT NULL,
    visitor_session_id text NOT NULL,
    unanswered_question text NOT NULL,
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    customer_phone text NULL,
    note text NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    chat_history jsonb NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT bot_leads_pkey PRIMARY KEY (id),
    CONSTRAINT bot_leads_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE
);

-- invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    company_name text NOT NULL,
    company_tax_code text NOT NULL,
    company_address text NOT NULL,
    recipient_email text NOT NULL,
    status public.invoice_status DEFAULT 'pending' NOT NULL,
    line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    provider public.invoice_provider DEFAULT 'easyinvoice' NOT NULL,
    provider_ref_id text NULL,
    provider_pattern text NULL,
    provider_serial text NULL,
    provider_invoice_no text NULL,
    provider_lookup_code text NULL,
    link_view text NULL,
    tax_authority_status text NULL,
    tax_authority_error text NULL,
    error_message text NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    issued_at timestamptz NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT invoices_pkey PRIMARY KEY (id),
    CONSTRAINT invoices_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE RESTRICT,
    CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT invoices_tax_code_format CHECK (company_tax_code ~ '^[0-9]{10}(-[0-9]{3})?$')
);

-- ============================================================
-- 3. ADD MISSING COLUMNS TO EXISTING TABLES (after tables are created)
-- ============================================================

-- Add pwa_updated_at to bots table
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS pwa_updated_at timestamptz DEFAULT now() NOT NULL;

-- Add personality_id to bots table (after ai_personalities table is created)
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS personality_id uuid NULL;
ALTER TABLE public.bots ADD CONSTRAINT bots_personality_id_fkey 
    FOREIGN KEY (personality_id) REFERENCES public.ai_personalities(id) ON DELETE SET NULL;

-- ============================================================
-- 4. CREATE INDEXES
-- ============================================================

-- bot_skills indexes
CREATE INDEX IF NOT EXISTS idx_bot_skills_skill_id ON public.bot_skills (skill_id);

-- bot_leads indexes
CREATE INDEX IF NOT EXISTS idx_bot_leads_bot_id ON public.bot_leads (bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_leads_status ON public.bot_leads (status);
CREATE INDEX IF NOT EXISTS idx_bot_leads_bot_created ON public.bot_leads (bot_id, created_at DESC);

-- invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON public.invoices (payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_payment_id_active
    ON public.invoices (payment_id)
    WHERE status NOT IN ('cancelled'::public.invoice_status, 'replaced'::public.invoice_status);

-- ============================================================
-- 5. CREATE FUNCTIONS
-- ============================================================

-- update_pwa_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_pwa_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    NEW.pwa_updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 6. CREATE TRIGGERS
-- ============================================================

-- bot_leads trigger
create trigger update_bot_leads_updated_at before
update
    on
    public.bot_leads for each row execute function update_updated_at_column();

-- bots pwa_updated_at trigger
CREATE TRIGGER update_bots_pwa_updated_at
    BEFORE UPDATE ON public.bots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pwa_updated_at_column();

-- invoices trigger
create trigger update_invoices_updated_at before
update
    on
    public.invoices for each row execute function update_updated_at_column();

-- ============================================================
-- 7. ENABLE RLS ON NEW TABLES
-- ============================================================

ALTER TABLE public.ai_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. CREATE RLS POLICIES
-- ============================================================

-- ai_personalities policies
CREATE POLICY "ai_personalities_select_authenticated" ON public.ai_personalities
    FOR SELECT TO authenticated USING (true);

-- ai_skills policies
CREATE POLICY "ai_skills_select_authenticated" ON public.ai_skills
    FOR SELECT TO authenticated USING (true);

-- bot_skills policies
CREATE POLICY "bot_skills_all_own" ON public.bot_skills FOR ALL USING (
    EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_skills.bot_id AND bots.user_id = auth.uid())
);

-- bot_leads policies
CREATE POLICY "bot_leads_own" ON public.bot_leads FOR ALL USING (
    EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_leads.bot_id AND bots.user_id = auth.uid())
);

-- invoices policies
CREATE POLICY "invoices_select_own" ON public.invoices FOR SELECT USING (auth.uid() = user_id);

-- Revoke INSERT, UPDATE, DELETE on invoices from authenticated and anon
REVOKE INSERT, UPDATE, DELETE ON TABLE public.invoices FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.invoices FROM anon;

-- ============================================================
-- 9. ADD BOTS TO REALTIME PUBLICATION
-- ============================================================

-- Add bots to realtime publication (skip if already added)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bots;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
