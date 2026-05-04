-- Add 'update_knowledge_refund' value to transaction_type enum
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'update_knowledge_refund' AFTER 'update_knowledge';
