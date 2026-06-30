-- Create bot_leads table for storing lead generation form submissions
-- Triggered when RAG similarity score falls below threshold

CREATE TABLE IF NOT EXISTS public.bot_leads (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  bot_id UUID NOT NULL,
  visitor_session_id TEXT NOT NULL,
  unanswered_question TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  chat_history JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT bot_leads_pkey PRIMARY KEY (id),
  CONSTRAINT bot_leads_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE,
  CONSTRAINT bot_leads_status_check CHECK (status IN ('pending', 'contacted', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_bot_leads_bot_id ON public.bot_leads (bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_leads_status ON public.bot_leads (status);
CREATE INDEX IF NOT EXISTS idx_bot_leads_bot_created ON public.bot_leads (bot_id, created_at DESC);

ALTER TABLE public.bot_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY bot_leads_own ON public.bot_leads
  FOR ALL
  USING (bot_id IN (
    SELECT id FROM public.bots WHERE user_id = auth.uid()
  ));

CREATE TRIGGER update_bot_leads_updated_at BEFORE UPDATE
  ON public.bot_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
