-- Add payment_id to credit_transactions for direct traceability

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS payment_id uuid NULL
    REFERENCES public.payments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_payment_id
  ON public.credit_transactions (payment_id);
