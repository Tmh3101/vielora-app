-- Create transaction_type enum and migrate credit_transactions column

DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM (
    'subscription_renewal',
    'index_pages',
    'index_pages_refund',
    'chat_message',
    'chat_message_refund',
    'add_knowledge',
    'update_knowledge',
    'plan_downgrade',
    'monthly_reset'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Alter column: cast existing text values to the new enum
ALTER TABLE public.credit_transactions
  ALTER COLUMN transaction_type TYPE public.transaction_type
  USING transaction_type::public.transaction_type;

COMMENT ON TYPE public.transaction_type IS
  'All possible credit transaction types. Refund variants mirror their debit counterparts.';
