-- Security events log (T-03, Smart Homepage SH-001)
-- Records blocked navigation attempts, malicious URL detection, user cancellations.
-- Service-role only writes (no admin insert policy needed).

-- 1. Create enum for action types
DO $$ BEGIN
  CREATE TYPE public.security_action_type AS ENUM (
    'BLOCKED_SECURITY',   -- Server/client blocked a malicious URL
    'CANCELLED_BY_USER',  -- User clicked Cancel on the countdown banner
    'BLOCKED_CLIENT'      -- Widget client-side re-validation rejected URL
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create table
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,
    conversation_id UUID NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    action_type public.security_action_type NOT NULL,
    reason TEXT NULL,
    user_agent TEXT NULL,
    ip_address TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Index for analytics queries (per-bot, per-action-type lookups)
CREATE INDEX IF NOT EXISTS idx_security_events_bot_action_created
  ON public.security_events (bot_id, action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_visitor_created
  ON public.security_events (visitor_id, created_at DESC);

-- 4. RLS: service-role only writes; no client reads in V1
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- No policies = no client access via PostgREST.
-- Inserts come from server actions via createAdminClient() (service-role bypasses RLS).
-- Admin dashboard reads will be added in V2 via a service-role query.

-- 5. Comment
COMMENT ON TABLE public.security_events IS
  'Security and cancellation audit log for Smart Homepage navigation events (T-03).';
