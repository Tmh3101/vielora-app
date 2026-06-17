CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $$
  SELECT id 
  FROM auth.users 
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_free_plan_id uuid;
  v_monthly_credits int4;
BEGIN
  SELECT id, monthly_credits
  INTO v_free_plan_id, v_monthly_credits
  FROM public.plans
  WHERE code = 'free'
  LIMIT 1;

  IF v_free_plan_id IS NULL THEN
    RAISE EXCEPTION 'Missing required plan: free';
  END IF;

  INSERT INTO public.subscriptions (user_id, plan_id, billing_cycle, status, current_period_start, current_period_end, next_credit_reset_at)
  VALUES (NEW.id, v_free_plan_id, 'monthly', 'active', now(), now() + '1 mon'::interval, now() + '1 mon'::interval);

  INSERT INTO public.wallets (user_id, subscription_credits, payg_credits, is_payg_enabled)
  VALUES (NEW.id, v_monthly_credits, 0, false);

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
  VALUES (
    NEW.id,
    v_monthly_credits,
    'subscription_renewal',
    format('Initial %s credits granted for free plan', v_monthly_credits)
  );

  RETURN NEW;
END;
$function$
;

DO $$ BEGIN
    CREATE TYPE public.bot_status AS ENUM ('pending', 'discovering', 'discovered', 'indexing', 'ready', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.page_status AS ENUM ('pending', 'processing', 'pending_index', 'ignored', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.page_error_type AS ENUM (
      'network_error',
      'timeout_error',
      'http_error',
      'rate_limited',
      'blocked',
      'parse_error',
      'render_error',
      'empty_content',
      'url_error',
      'not_found',
      'unknown_error'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.pricing_plan AS ENUM ('free', 'standard', 'pro', 'enterprise');
    CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly', 'none');
    CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
    CREATE TYPE public.payment_type AS ENUM ('subscription', 'payg', 'subscription_upgrade', 'subscription_renew');
    CREATE TYPE public.job_status AS ENUM ('pending', 'active', 'completed', 'failed');
    CREATE TYPE public.transaction_type AS ENUM (
      'subscription_renewal',
      'index_pages',
      'index_pages_refund',
      'chat_message',
      'chat_message_refund',
      'add_knowledge',
      'add_knowledge_refund',
      'update_knowledge',
      'update_knowledge_refund',
      'plan_downgrade',
      'monthly_reset',
      'payg_purchase'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- public.plans definition

CREATE TABLE public.plans (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	code public.pricing_plan NOT NULL,
	name text NOT NULL,
	bots_limit int4 DEFAULT 1 NOT NULL,
	monthly_credits int4 DEFAULT 1000 NOT NULL,
	description text NULL,
	pricing jsonb DEFAULT '{}'::jsonb NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT plans_pkey PRIMARY KEY (id),
	CONSTRAINT plans_code_key UNIQUE (code),
	CONSTRAINT plans_monthly_credits_non_negative CHECK (monthly_credits >= 0),
	CONSTRAINT plans_bots_limit_positive CHECK (bots_limit > 0)
);

create trigger update_plans_updated_at before
update
    on
    public.plans for each row execute function update_updated_at_column();

INSERT INTO public.plans (code, name, bots_limit, monthly_credits, description, pricing, is_active)
VALUES
  (
    'free', 'Free', 1, 100, 'Starter plan for new users',
    '{"VND": {"monthly": 0, "yearly": 0}, "USD": {"monthly": 0, "yearly": 0}}'::jsonb,
    true
  ),
  (
    'standard', 'Standard', 2, 1000, 'Balanced plan for growing teams',
    '{"VND": {"monthly": 249000, "yearly": 2490000}, "USD": {"monthly": 9, "yearly": 90}}'::jsonb,
    true
  ),
  (
    'pro', 'Pro', 5, 5000, 'Advanced plan for high-usage teams',
    '{"VND": {"monthly": 499000, "yearly": 4990000}, "USD": {"monthly": 29, "yearly": 290}}'::jsonb,
    true
  )
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  bots_limit = EXCLUDED.bots_limit,
  monthly_credits = EXCLUDED.monthly_credits,
  description = EXCLUDED.description,
  pricing = EXCLUDED.pricing,
  is_active = EXCLUDED.is_active;

-- public.bots definition

-- Drop table

-- DROP TABLE public.bots;

CREATE TABLE public.bots (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	name text NOT NULL,
	domain text NOT NULL,
	status public.bot_status DEFAULT 'pending',
	verification_token text NULL,
	verified_at timestamptz NULL,
	last_crawl_at timestamptz NULL,
	crawl_settings jsonb DEFAULT '{"language": "vi", "maxPages": 100, "excludePatterns": [], "includePatterns": []}'::jsonb NULL,
	widget_settings jsonb DEFAULT '{"position": "bottom-right", "primaryColor": "#3B82F6", "welcomeMessage": "Xin chào! Tôi có thể giúp gì cho bạn?", "suggestedQuestions": []}'::jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	avatar_url text NULL, -- URL of the bot avatar image stored in Supabase Storage
	rate_limit_per_day int4 NULL, -- Maximum messages a single visitor can send per day (24h window)
	rate_limit_per_ip int4 NULL, -- Maximum messages from a single IP per day for DDoS protection
	is_stopped boolean NOT NULL DEFAULT false, -- Whether the bot is manually stopped by the owner
	slug text NULL, -- URL-friendly unique identifier for standalone chat page
	is_public boolean NOT NULL DEFAULT false, -- Whether the bot is accessible via public standalone link
	is_banned boolean NOT NULL DEFAULT false,
	allowed_domains text[] NOT NULL DEFAULT '{}'::text[], -- Domains allowed to embed this bot widget. Maximum 5 normalized hostnames.
	CONSTRAINT bots_pkey PRIMARY KEY (id),
	CONSTRAINT bots_slug_key UNIQUE (slug),
	CONSTRAINT bots_allowed_domains_max_5 CHECK (cardinality(allowed_domains) <= 5)
);
CREATE INDEX idx_bots_rate_limits ON public.bots USING btree (id, rate_limit_per_day, rate_limit_per_ip);
CREATE INDEX idx_bots_slug ON public.bots USING btree (slug) WHERE slug IS NOT NULL;

-- Table Triggers

create trigger update_bots_updated_at before
update
    on
    public.bots for each row execute function update_updated_at_column();



-- public.conversations definition

-- Drop table

-- DROP TABLE public.conversations;

CREATE TABLE public.conversations (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	bot_id uuid NOT NULL,
	visitor_id text NOT NULL,
	started_at timestamptz DEFAULT now() NOT NULL,
	ended_at timestamptz NULL,
	CONSTRAINT conversations_pkey PRIMARY KEY (id),
	CONSTRAINT conversations_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE
);


-- public.documents definition

-- Kích hoạt extension hỗ trợ lưu trữ và tìm kiếm vector
create extension if not exists vector with schema public;

-- Drop table
-- DROP TABLE public.documents;

CREATE TABLE public.documents (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	bot_id uuid NOT NULL,
	content text NOT NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	embedding public.vector(768) NULL,
    -- Thêm cột fts dùng từ điển 'simple'
	fts tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT documents_pkey PRIMARY KEY (id),
	CONSTRAINT documents_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE
);

CREATE INDEX documents_bot_id_idx ON public.documents USING btree (bot_id);
CREATE INDEX documents_embedding_idx ON public.documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Table Triggers
create trigger on_documents_updated before
update
    on
    public.documents for each row execute function update_updated_at_column();


-- public.messages definition

-- Drop table

-- DROP TABLE public.messages;

CREATE TABLE public.messages (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	conversation_id uuid NOT NULL,
	role text NOT NULL,
	content text NOT NULL,
	no_answer bool DEFAULT false NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	prompt_tokens int4 DEFAULT 0 NOT NULL,
	completion_tokens int4 DEFAULT 0 NOT NULL,
	CONSTRAINT messages_pkey PRIMARY KEY (id),
	CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation_id ON public.messages (conversation_id);


-- public.pages definition

-- Drop table

-- DROP TABLE public.pages;

CREATE TABLE public.pages (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	bot_id uuid NOT NULL,
	url text NOT NULL,
  status public.page_status DEFAULT 'pending',
  source_type text NOT NULL DEFAULT 'website',
  depth int NULL,
	title text NULL,
	content text NULL,
	raw_content text NULL,
	content_hash text NULL,
	error_message text NULL,
	error_type public.page_error_type NULL, -- Categorized error type when status = 'failed'
	http_status_code int4 NULL,             -- HTTP status code returned by the server
	crawled_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT pages_pkey PRIMARY KEY (id),
	CONSTRAINT pages_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE,
	CONSTRAINT pages_source_type_check CHECK (source_type IN ('website', 'manual_text', 'file', 'single_url'))
);

CREATE INDEX idx_pages_bot_id_url ON public.pages (bot_id, url);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_bot_id_url_unique ON public.pages (bot_id, url);
CREATE INDEX IF NOT EXISTS idx_pages_bot_status ON public.pages (bot_id, status);
CREATE INDEX IF NOT EXISTS idx_pages_bot_error_type ON public.pages (bot_id, error_type);
CREATE INDEX IF NOT EXISTS idx_pages_bot_crawled_at_desc ON public.pages (bot_id, crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_source_type ON public.pages (source_type);
CREATE INDEX IF NOT EXISTS idx_pages_bot_id_source_type ON public.pages (bot_id, source_type);



-- public.usage_logs definition

-- Drop table

-- DROP TABLE public.usage_logs;

CREATE TABLE public.usage_logs (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	bot_id uuid NULL,
	action text NOT NULL,
	count int4 DEFAULT 1 NULL,
	visitor_id text NULL,
	client_ip text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT usage_logs_pkey PRIMARY KEY (id),
	CONSTRAINT usage_logs_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_bot_visitor_action_created
  ON public.usage_logs (bot_id, visitor_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_bot_ip_action_created
  ON public.usage_logs (bot_id, client_ip, action, created_at DESC);



-- public.subscriptions definition

-- Drop table

-- DROP TABLE public.subscriptions;

CREATE TABLE public.subscriptions (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	plan_id uuid NOT NULL,
	billing_cycle public.billing_cycle DEFAULT 'monthly'::public.billing_cycle,
	status text DEFAULT 'active',
	cancel_at_period_end bool DEFAULT false,
	current_period_start timestamptz DEFAULT now() NOT NULL,
	current_period_end timestamptz DEFAULT now() + '1 mon'::interval NOT NULL,
	next_credit_reset_at timestamptz DEFAULT now() + '1 mon'::interval NOT NULL,
	needs_bot_selection bool DEFAULT false NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
	CONSTRAINT subscriptions_user_id_key UNIQUE (user_id)
);

-- Table Triggers

create trigger update_subscriptions_updated_at before
update
    on
    public.subscriptions for each row execute function update_updated_at_column();

-- public.wallets definition

CREATE TABLE public.wallets (
	user_id uuid NOT NULL,
	subscription_credits int4 DEFAULT 1000 NOT NULL,
	payg_credits int4 DEFAULT 0 NOT NULL,
	total_credits int4 GENERATED ALWAYS AS (subscription_credits + payg_credits) STORED,
	updated_at timestamptz DEFAULT now() NOT NULL,
	is_payg_enabled bool DEFAULT false,
	CONSTRAINT wallets_pkey PRIMARY KEY (user_id),
	CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create trigger update_wallets_updated_at before
update
    on
    public.wallets for each row execute function update_updated_at_column();

-- public.payments definition

CREATE TABLE public.payments (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	amount int8 NOT NULL,
	currency text DEFAULT 'VND',
	status public.payment_status DEFAULT 'pending'::public.payment_status,
	payment_type public.payment_type NOT NULL,
	provider text NOT NULL,
	provider_transaction_id text NULL,
	metadata jsonb DEFAULT '{}'::jsonb,
	plan_id uuid NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT payments_pkey PRIMARY KEY (id),
	CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
	CONSTRAINT payments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_plan_id ON public.payments (plan_id);

create trigger update_payments_updated_at before
update
    on
    public.payments for each row execute function update_updated_at_column();

-- public.credit_transactions definition

CREATE TABLE public.credit_transactions (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	payment_id uuid NULL,
	amount int4 NOT NULL,
	transaction_type public.transaction_type NOT NULL,
	description text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT credit_transactions_pkey PRIMARY KEY (id),
	CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
	CONSTRAINT credit_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created_at
  ON public.credit_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_type_created_at
  ON public.credit_transactions (user_id, transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_payment_id
  ON public.credit_transactions (payment_id);

-- public.jobs definition

CREATE TABLE public.jobs (
	id text NOT NULL,
	bot_id uuid NULL,
	name text NOT NULL,
	status public.job_status NOT NULL DEFAULT 'pending',
	progress int4 NOT NULL DEFAULT 0,
	data jsonb NOT NULL DEFAULT '{}'::jsonb,
	error_message text NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	started_at timestamptz NULL,
	finished_at timestamptz NULL,
	CONSTRAINT jobs_pkey PRIMARY KEY (id),
	CONSTRAINT jobs_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jobs_bot_id     ON public.jobs (bot_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status     ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_name       ON public.jobs (name);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs (created_at DESC);

-- public.credit_packages definition

CREATE TABLE public.credit_packages (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	name text NOT NULL,
	credits_amount int4 NOT NULL,
	price jsonb DEFAULT '{"USD": 0, "VND": 0}'::jsonb NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT credit_packages_pkey PRIMARY KEY (id)
);

create trigger update_credit_packages_updated_at before
update
    on
    public.credit_packages for each row execute function update_updated_at_column();

-- public.admin_users definition

CREATE TABLE public.admin_users (
	id uuid NOT NULL,
	email text NOT NULL,
	otp_code text NULL,
	otp_expires_at timestamptz NULL,
	role text DEFAULT 'admin'::text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT admin_users_pkey PRIMARY KEY (id),
	CONSTRAINT admin_users_email_key UNIQUE (email),
	CONSTRAINT admin_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- public.support_tickets definition

CREATE TABLE public.support_tickets (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NULL,
	subject text NOT NULL,
	message text NOT NULL,
	status text DEFAULT 'open'::text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	admin_response text NULL,
	resolved_at timestamptz NULL,
	CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
	CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Table Triggers
create trigger send_ticket_notification after
insert
    on
    public.support_tickets for each row execute function supabase_functions.http_request(
      'https://vielora-admin.vercel.app/api/webhooks/support-ticket',
      'POST',
      '{"Authorization":"Bearer vielora_YQi8HhaUScBUMIYjMgUnFDk9qypchqiu"}',
      '{}',
      '5000'
    );

-- public.discounts definition

CREATE TABLE public.discounts (
	code text NOT NULL,
	discount_value numeric NOT NULL,
	type text NOT NULL,
	is_active boolean DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT discounts_pkey PRIMARY KEY (code),
	CONSTRAINT discounts_type_check CHECK (type = ANY (ARRAY['percent'::text, 'fixed'::text]))
);

-- public.banned_users definition

CREATE TABLE public.banned_users (
	user_id uuid NOT NULL,
	reason text NULL,
	banned_at timestamptz DEFAULT now() NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT banned_users_pkey PRIMARY KEY (user_id),
	CONSTRAINT banned_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- public.categories definition

CREATE TABLE public.categories (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	name text NOT NULL,
	slug text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT categories_pkey PRIMARY KEY (id),
	CONSTRAINT categories_name_key UNIQUE (name),
	CONSTRAINT categories_slug_key UNIQUE (slug)
);

-- public.posts definition

CREATE TABLE public.posts (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	title text NOT NULL,
	slug text NOT NULL,
	summary text NOT NULL,
	thumbnail_url text NULL,
	content text NOT NULL,
	status text DEFAULT 'draft'::text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	published_at timestamptz NULL,
	CONSTRAINT posts_pkey PRIMARY KEY (id),
	CONSTRAINT posts_slug_key UNIQUE (slug),
	CONSTRAINT posts_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text]))
);

create trigger update_posts_updated_at before
update
    on
    public.posts for each row execute function update_updated_at_column();

-- public.post_categories definition

CREATE TABLE public.post_categories (
	post_id uuid NOT NULL,
	category_id uuid NOT NULL,
	CONSTRAINT post_categories_pkey PRIMARY KEY (post_id, category_id),
	CONSTRAINT post_categories_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
	CONSTRAINT post_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE
);

-- public.shopify_sessions_migrations definition

CREATE TABLE public.shopify_sessions_migrations (
	migration_name varchar NOT NULL,
	CONSTRAINT shopify_sessions_migrations_pkey PRIMARY KEY (migration_name)
);

-- public.shopify_sessions definition

CREATE TABLE public.shopify_sessions (
	id varchar NOT NULL,
	shop varchar NOT NULL,
	state varchar NOT NULL,
	"isOnline" bool NOT NULL,
	scope varchar NULL,
	expires int4 NULL,
	"accessToken" varchar NULL,
	"refreshToken" varchar NULL,
	"refreshTokenExpires" int8 NULL,
	"userId" int8 NULL,
	"firstName" varchar NULL,
	"lastName" varchar NULL,
	email varchar NULL,
	"accountOwner" bool NULL,
	locale varchar NULL,
	collaborator bool NULL,
	"emailVerified" bool NULL,
	CONSTRAINT shopify_sessions_pkey PRIMARY KEY (id)
);

-- public.bots foreign keys

ALTER TABLE public.bots ADD CONSTRAINT bots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.subscriptions foreign keys

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);

CREATE TRIGGER on_auth_user_created_billing AFTER
INSERT
    ON
    auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_billing();


-- ============================================================
-- ROW LEVEL SECURITY (ENTERPRISE STANDARD)
-- Bắt buộc bật cho 100% các bảng để chống lộ lọt qua anon_key
-- ============================================================

-- BẬT RLS CHO TẤT CẢ CÁC BẢNG
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_sessions_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_sessions ENABLE ROW LEVEL SECURITY;

-- 1. PLANS (Public Read-only)
CREATE POLICY "plans_select_all" ON public.plans FOR SELECT USING (true);

-- 2. DỮ LIỆU CÁ NHÂN (Profiles, Bots)
CREATE POLICY "bots_all_own" ON public.bots FOR ALL USING (auth.uid() = user_id);

-- Public PWA branding: anonymous users can read public bot branding metadata
CREATE POLICY "bots_select_public_pwa_branding"
  ON public.bots FOR SELECT
  TO anon
  USING (is_public = true AND slug IS NOT NULL);

REVOKE SELECT ON TABLE public.bots FROM anon;
GRANT SELECT (slug, name, widget_settings, avatar_url) ON TABLE public.bots TO anon;

-- 3. DỮ LIỆU TÀI CHÍNH (Chỉ Read-only từ Client, Update qua Backend Service Role)
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_select_own" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_select_own" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_transactions_select_own" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- 4. DỮ LIỆU LIÊN KẾT (Cần xác thực qua bot_id)
-- Người dùng chỉ được CRUD dữ liệu nếu họ là chủ của Bot đó
CREATE POLICY "pages_all_own" ON public.pages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = pages.bot_id AND bots.user_id = auth.uid())
);

CREATE POLICY "documents_all_own" ON public.documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = documents.bot_id AND bots.user_id = auth.uid())
);

CREATE POLICY "conversations_all_own" ON public.conversations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = conversations.bot_id AND bots.user_id = auth.uid())
);

CREATE POLICY "usage_logs_select_own" ON public.usage_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = usage_logs.bot_id AND bots.user_id = auth.uid())
);

CREATE POLICY "jobs_select_own" ON public.jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = jobs.bot_id AND bots.user_id = auth.uid())
);

ALTER publication supabase_realtime ADD TABLE public.bots;

-- 5. MESSAGES (Liên kết qua conversation_id -> bot_id)
CREATE POLICY "messages_all_own" ON public.messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    JOIN public.bots b ON c.bot_id = b.id 
    WHERE c.id = messages.conversation_id AND b.user_id = auth.uid()
  )
);

-- 6. CREDIT PACKAGES (Public Read-only for active packages)
CREATE POLICY "Cho phép đọc các gói active" ON public.credit_packages FOR SELECT USING (is_active = true);

-- 7. ADMIN / SUPPORT TABLES
CREATE POLICY "Allow service role all operations" ON public.admin_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all operations" ON public.support_tickets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "support_tickets_select_own" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "support_tickets_insert_own" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow service role all operations" ON public.discounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all operations" ON public.banned_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. BLOG TABLES (Public Read + Service Role)
CREATE POLICY "Allow public read categories" ON public.categories FOR SELECT TO public USING (true);
CREATE POLICY "Allow service role all operations on categories" ON public.categories FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read published posts" ON public.posts
  FOR SELECT TO public USING (status = 'published'::text);
CREATE POLICY "Allow service role all operations on posts" ON public.posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read post_categories" ON public.post_categories FOR SELECT TO public USING (true);
CREATE POLICY "Allow service role all operations on post_categories" ON public.post_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
