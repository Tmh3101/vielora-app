-- Migration file: supabase/migrations/20260719_create_invoices_table.sql

-- Enum types for invoices
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

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    user_id uuid NOT NULL,

    -- Corporate details snapshot at payment time (independent of current user profile settings)
    company_name text NOT NULL,
    company_tax_code text NOT NULL,
    company_address text NOT NULL,
    recipient_email text NOT NULL,

    -- Processing status
    status public.invoice_status DEFAULT 'pending' NOT NULL,

    -- Snapshot of purchased products (pricing tiers / options) for auditing
    line_items jsonb DEFAULT '[]'::jsonb NOT NULL,

    -- Provider settings
    provider public.invoice_provider DEFAULT 'easyinvoice' NOT NULL,
    provider_ref_id text NULL,          -- integration key (Ikey) sent to provider (= invoices.id)
    provider_pattern text NULL,         -- invoice pattern (Pattern, e.g., 1/001)
    provider_serial text NULL,          -- invoice serial (Serial, e.g., C26TAA)
    provider_invoice_no text NULL,      -- issued invoice number (No)
    provider_lookup_code text NULL,     -- lookup code (LookupCode) used for on-demand PDF fetch
    link_view text NULL,                -- public direct web view URL returned by provider

    -- Tax authority (CQT) status tracking
    tax_authority_status text NULL,     -- TCTCheckStatus
    tax_authority_error text NULL,      -- TCTErrorMessage

    -- Error tracking & retries
    error_message text NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    
    -- Timestamps
    issued_at timestamptz NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT invoices_pkey PRIMARY KEY (id),
    
    -- Relationships
    CONSTRAINT invoices_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE RESTRICT,
    CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Strict Regex checking for Vietnamese Tax Code (MST)
    CONSTRAINT invoices_tax_code_format CHECK (company_tax_code ~ '^[0-9]{10}(-[0-9]{3})?$')
);

-- Performance Indexes & Idempotency Constraints
CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON public.invoices (payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);

-- Idempotency Guard: A payment can only have at most one ACTIVE invoice at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_payment_id_active
  ON public.invoices (payment_id)
  WHERE status NOT IN ('cancelled', 'replaced');

-- Timestamp Update Trigger
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row-Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Read Policy: Users can view their own invoice history
CREATE POLICY "invoices_select_own" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

-- Modify Rights: Revoke all direct client insert/update/delete grants
REVOKE INSERT, UPDATE, DELETE ON TABLE public.invoices FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.invoices FROM anon;
