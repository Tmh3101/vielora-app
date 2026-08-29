-- Migration: 20260827_01_pending_auth_sessions.sql
-- Description: Temporary session staging table for iOS PWA OAuth bridge

CREATE TABLE IF NOT EXISTS pending_auth_sessions (
  id UUID PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on expires_at for fast lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_pending_auth_expires ON pending_auth_sessions (expires_at);

-- Enable RLS (Service role only access)
ALTER TABLE pending_auth_sessions ENABLE ROW LEVEL SECURITY;
-- No public policies -> accessible only with service_role key
