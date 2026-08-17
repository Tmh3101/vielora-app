-- Migration: 20260811160000_group_chat_core.sql
-- Description: Core database schema for Group Chat (spec §3.1-3.6)

-- 1. Enum for group message sender type
DO $$ BEGIN
  CREATE TYPE public.group_message_sender_type AS ENUM ('user', 'bot');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. group_chats table (1:1 with bots)
CREATE TABLE IF NOT EXISTS public.group_chats (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  bot_id uuid NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT group_chats_pkey PRIMARY KEY (id),
  CONSTRAINT group_chats_bot_id_key UNIQUE (bot_id),
  CONSTRAINT group_chats_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE,
  CONSTRAINT group_chats_status_check CHECK (status IN ('active', 'disabled'))
);

DROP TRIGGER IF EXISTS update_group_chats_updated_at ON public.group_chats;
CREATE TRIGGER update_group_chats_updated_at
  BEFORE UPDATE ON public.group_chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  email text NOT NULL,
  role_label text NULL,
  can_pin_knowledge boolean DEFAULT false NOT NULL,
  invited_by uuid NOT NULL,
  last_read_at timestamptz NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_user_unique UNIQUE (group_id, user_id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.group_chats(id) ON DELETE CASCADE,
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members (user_id);

-- 5-member limit trigger function
CREATE OR REPLACE FUNCTION public.enforce_group_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF (SELECT COUNT(*) FROM public.group_members WHERE group_id = NEW.group_id) >= 5 THEN
    RAISE EXCEPTION 'GROUP_MEMBER_LIMIT_REACHED';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_group_member_limit ON public.group_members;
CREATE TRIGGER trg_enforce_group_member_limit
  BEFORE INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_member_limit();

-- 4. group_messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  group_id uuid NOT NULL,
  sender_type public.group_message_sender_type DEFAULT 'user' NOT NULL,
  sender_id uuid NULL,
  content text NOT NULL,
  reply_to_id uuid NULL,
  mentions uuid[] DEFAULT '{}' NOT NULL,
  should_bot_reply boolean DEFAULT true NOT NULL,
  no_answer boolean NULL,
  deleted_at timestamptz NULL,
  deleted_by uuid NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT group_messages_pkey PRIMARY KEY (id),
  CONSTRAINT group_messages_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.group_chats(id) ON DELETE CASCADE,
  CONSTRAINT group_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.group_messages(id) ON DELETE SET NULL,
  CONSTRAINT group_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_created ON public.group_messages (group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_group_messages_reply_to ON public.group_messages (reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_messages_mentions ON public.group_messages USING gin (mentions);

-- 5. chat_knowledge table
CREATE TABLE IF NOT EXISTS public.chat_knowledge (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  bot_id uuid NOT NULL,
  group_id uuid NOT NULL,
  message_id uuid NULL,
  question text NOT NULL,
  answer text NULL,
  pinned_by uuid NOT NULL,
  document_id uuid NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT chat_knowledge_pkey PRIMARY KEY (id),
  CONSTRAINT chat_knowledge_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE,
  CONSTRAINT chat_knowledge_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.group_chats(id) ON DELETE CASCADE,
  CONSTRAINT chat_knowledge_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.group_messages(id) ON DELETE SET NULL,
  CONSTRAINT chat_knowledge_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_knowledge_bot_id ON public.chat_knowledge (bot_id);

-- 6. group_chat_insights table
CREATE TABLE IF NOT EXISTS public.group_chat_insights (
  bot_id uuid NOT NULL,
  group_id uuid NOT NULL,
  summary text DEFAULT '' NOT NULL,
  document_id uuid NULL,
  last_summarized_message_at timestamptz NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT group_chat_insights_pkey PRIMARY KEY (bot_id),
  CONSTRAINT group_chat_insights_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE,
  CONSTRAINT group_chat_insights_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.group_chats(id) ON DELETE CASCADE,
  CONSTRAINT group_chat_insights_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL
);
