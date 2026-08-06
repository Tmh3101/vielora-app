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

-- Drop CHECK constraints that compare with text literals
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_provider_check;

-- Drop the unique index that has text comparison in WHERE clause
DROP INDEX IF EXISTS public.idx_invoices_payment_id_active;

-- Alter invoices.status column
ALTER TABLE public.invoices ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.invoices 
    ALTER COLUMN status TYPE public.invoice_status 
    USING status::text::public.invoice_status;
ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'pending'::public.invoice_status;

-- Alter invoices.provider column
ALTER TABLE public.invoices ALTER COLUMN provider DROP DEFAULT;
ALTER TABLE public.invoices 
    ALTER COLUMN provider TYPE public.invoice_provider 
    USING provider::text::public.invoice_provider;
ALTER TABLE public.invoices ALTER COLUMN provider SET DEFAULT 'easyinvoice'::public.invoice_provider;

-- Recreate the unique index with proper enum casting
CREATE UNIQUE INDEX idx_invoices_payment_id_active
  ON public.invoices (payment_id)
  WHERE status NOT IN ('cancelled'::public.invoice_status, 'replaced'::public.invoice_status);
