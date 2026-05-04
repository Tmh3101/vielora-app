-- Add 'add_knowledge_refund' value to transaction_type enum
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'add_knowledge_refund' AFTER 'add_knowledge';
