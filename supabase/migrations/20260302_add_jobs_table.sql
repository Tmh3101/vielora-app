-- Migration: Add persistent job tracking table
-- Mirrors BullMQ job state into Supabase for historical tracking and dashboard queries.

-- ── 1. Enum ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE public.job_status AS ENUM ('pending', 'active', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ── 2. Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.jobs (
    id          text                    NOT NULL,
    bot_id      uuid                    NULL,
    name        text                    NOT NULL,
    status      public.job_status       NOT NULL DEFAULT 'pending',
    progress    int4                    NOT NULL DEFAULT 0,
    data        jsonb                   NOT NULL DEFAULT '{}'::jsonb,
    error_message text                  NULL,
    created_at  timestamptz             NOT NULL DEFAULT now(),
    started_at  timestamptz             NULL,
    finished_at timestamptz             NULL,
    CONSTRAINT jobs_pkey PRIMARY KEY (id),
    CONSTRAINT jobs_bot_id_fkey FOREIGN KEY (bot_id)
        REFERENCES public.bots(id) ON DELETE CASCADE
);

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_jobs_bot_id    ON public.jobs (bot_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status    ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_name      ON public.jobs (name);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs (created_at DESC);
