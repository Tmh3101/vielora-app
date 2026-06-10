-- Align vielora-prod with the local SQL snapshots:
-- - supabase/db-schema.sql
-- - supabase/analytics_indices.sql
--
-- This migration is intended for manual review/execution only.
-- It is idempotent where PostgreSQL supports it.

begin;

-- ---------------------------------------------------------------------------
-- Functions / event trigger from db-schema.sql
-- ---------------------------------------------------------------------------

create or replace function public.handle_updated_at()
 returns trigger
 language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.rls_auto_enable()
 returns event_trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
     if cmd.schema_name is not null and cmd.schema_name in ('public') and cmd.schema_name not in ('pg_catalog','information_schema') and cmd.schema_name not like 'pg_toast%' and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
     else
        raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     end if;
  end loop;
end;
$function$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

-- ---------------------------------------------------------------------------
-- Columns and constraints missing or different in vielora-prod
-- ---------------------------------------------------------------------------

alter table public.bots
  add column if not exists is_banned boolean not null default false;

alter table public.messages
  add column if not exists prompt_tokens int4 not null default 0,
  add column if not exists completion_tokens int4 not null default 0;

alter table public.pages
  drop constraint if exists pages_source_type_check;

alter table public.pages
  add constraint pages_source_type_check
  check (source_type in ('website', 'manual_text', 'file', 'single_url'));

alter table public.bots
  alter column widget_settings set default '{"position": "bottom-right", "primaryColor": "#3B82F6", "welcomeMessage": "Xin chào! Tôi có thể giúp gì cho bạn?", "suggestedQuestions": []}'::jsonb;

update public.bots
set widget_settings = jsonb_set(
  coalesce(widget_settings, '{}'::jsonb),
  '{suggestedQuestions}',
  coalesce(widget_settings->'suggestedQuestions', '[]'::jsonb),
  true
)
where widget_settings is null
   or not (widget_settings ? 'suggestedQuestions');

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'credit_packages'
      and column_name = 'price'
      and data_type <> 'jsonb'
  ) then
    alter table public.credit_packages
      alter column price drop default;

    alter table public.credit_packages
      alter column price drop not null;

    alter table public.credit_packages
      alter column price type jsonb
      using jsonb_build_object('VND', price, 'USD', 0);
  end if;
end $$;

alter table public.credit_packages
  alter column price set default '{"USD": 0, "VND": 0}'::jsonb;

-- ---------------------------------------------------------------------------
-- Tables missing from vielora-prod
-- ---------------------------------------------------------------------------

create table if not exists public.admin_users (
  id uuid not null,
  email text not null,
  otp_code text null,
  otp_expires_at timestamptz null,
  role text default 'admin'::text not null,
  created_at timestamptz default now() not null,
  constraint admin_users_pkey primary key (id),
  constraint admin_users_email_key unique (email),
  constraint admin_users_id_fkey foreign key (id) references auth.users(id) on delete cascade
);

create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() not null,
  user_id uuid null,
  subject text not null,
  message text not null,
  status text default 'open'::text not null,
  created_at timestamptz default now() not null,
  admin_response text null,
  resolved_at timestamptz null,
  constraint support_tickets_pkey primary key (id),
  constraint support_tickets_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null
);

create table if not exists public.discounts (
  code text not null,
  discount_value numeric not null,
  type text not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  constraint discounts_pkey primary key (code),
  constraint discounts_type_check check (type = any (array['percent'::text, 'fixed'::text]))
);

create table if not exists public.banned_users (
  user_id uuid not null,
  reason text null,
  banned_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  constraint banned_users_pkey primary key (user_id),
  constraint banned_users_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

alter table public.admin_users enable row level security;
alter table public.support_tickets enable row level security;
alter table public.discounts enable row level security;
alter table public.banned_users enable row level security;

-- ---------------------------------------------------------------------------
-- Policies for missing tables
-- ---------------------------------------------------------------------------

drop policy if exists "Allow service role all operations" on public.admin_users;
create policy "Allow service role all operations" on public.admin_users
  for all to service_role using (true) with check (true);

drop policy if exists "Allow service role all operations" on public.support_tickets;
create policy "Allow service role all operations" on public.support_tickets
  for all to service_role using (true) with check (true);

drop policy if exists "support_tickets_select_own" on public.support_tickets;
create policy "support_tickets_select_own"
  on public.support_tickets for select
  using (auth.uid() = user_id);

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

drop policy if exists "Allow service role all operations" on public.discounts;
create policy "Allow service role all operations" on public.discounts
  for all to service_role using (true) with check (true);

drop policy if exists "Allow service role all operations" on public.banned_users;
create policy "Allow service role all operations" on public.banned_users
  for all to service_role using (true) with check (true);

drop policy if exists "Cho phép đọc các gói active" on public.credit_packages;
create policy "Cho phép đọc các gói active" on public.credit_packages
  for select using (is_active = true);

-- ---------------------------------------------------------------------------
-- Analytics indexes and function from analytics_indices.sql
-- ---------------------------------------------------------------------------

create index if not exists idx_messages_created_at
  on public.messages (created_at);

create index if not exists idx_messages_conversation_id
  on public.messages (conversation_id);

create index if not exists idx_conversations_bot_id
  on public.conversations (bot_id);

create index if not exists idx_usage_logs_bot_action_created_at
  on public.usage_logs (bot_id, action, created_at);

create or replace function public.get_bot_analytics_v2(
  p_bot_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
returns jsonb
language sql
stable
set search_path = public
as $$
with bounds as (
  select
    p_start_date as current_from,
    p_end_date as current_to,
    p_start_date - interval '1 millisecond' as previous_to,
    (p_start_date - interval '1 millisecond') - (p_end_date - p_start_date) as previous_from
),
current_conversations as (
  select c.id, c.started_at
  from public.conversations c, bounds b
  where c.bot_id = p_bot_id
    and c.started_at >= b.current_from
    and c.started_at <= b.current_to
),
previous_conversations as (
  select c.id, c.started_at
  from public.conversations c, bounds b
  where c.bot_id = p_bot_id
    and c.started_at >= b.previous_from
    and c.started_at <= b.previous_to
),
current_messages as (
  select m.id, m.conversation_id, m.content, m.created_at, m.role, m.no_answer
  from public.messages m
  inner join public.conversations c on c.id = m.conversation_id
  cross join bounds b
  where c.bot_id = p_bot_id
    and m.created_at >= b.current_from
    and m.created_at <= b.current_to
),
previous_messages as (
  select m.id, m.conversation_id, m.created_at, m.role, m.no_answer
  from public.messages m
  inner join public.conversations c on c.id = m.conversation_id
  cross join bounds b
  where c.bot_id = p_bot_id
    and m.created_at >= b.previous_from
    and m.created_at <= b.previous_to
),
current_usage as (
  select coalesce(sum(coalesce(ul.count, 1)), 0)::int as value
  from public.usage_logs ul, bounds b
  where ul.bot_id = p_bot_id
    and ul.action = 'chat_message'
    and ul.created_at >= b.current_from
    and ul.created_at <= b.current_to
),
previous_usage as (
  select coalesce(sum(coalesce(ul.count, 1)), 0)::int as value
  from public.usage_logs ul, bounds b
  where ul.bot_id = p_bot_id
    and ul.action = 'chat_message'
    and ul.created_at >= b.previous_from
    and ul.created_at <= b.previous_to
),
kpi_values as (
  select
    (select count(*)::int from current_conversations) as current_conversations,
    (select count(*)::int from previous_conversations) as previous_conversations,
    (select count(*)::int from current_messages where role = 'user') as current_messages,
    (select count(*)::int from previous_messages where role = 'user') as previous_messages,
    (select count(*)::int from current_messages where role = 'user' and no_answer is true) as current_fallbacks,
    (select count(*)::int from previous_messages where role = 'user' and no_answer is true) as previous_fallbacks,
    (select value from current_usage) as current_credits,
    (select value from previous_usage) as previous_credits
),
trend_buckets as (
  select bucket_start
  from bounds b,
    generate_series(b.current_from, b.current_to, interval '1 day') as bucket_start
),
trends as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(tb.bucket_start, 'DD/MM'),
        'messages', (
          select count(*)::int
          from current_messages m, bounds b
          where m.role = 'user'
            and m.created_at >= tb.bucket_start
            and m.created_at < least(tb.bucket_start + interval '1 day', b.current_to + interval '1 millisecond')
        ),
        'conversations', (
          select count(*)::int
          from current_conversations c, bounds b
          where c.started_at >= tb.bucket_start
            and c.started_at < least(tb.bucket_start + interval '1 day', b.current_to + interval '1 millisecond')
        )
      )
      order by tb.bucket_start
    ),
    '[]'::jsonb
  ) as data
  from trend_buckets tb
),
heatmap_cells as (
  select day_value as day, hour_value as hour
  from generate_series(0, 6) as day_value
  cross join generate_series(0, 23) as hour_value
),
heatmap as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'day', hc.day,
        'hour', hc.hour,
        'value', coalesce(counts.value, 0)
      )
      order by hc.day, hc.hour
    ),
    '[]'::jsonb
  ) as data
  from heatmap_cells hc
  left join (
    select
      extract(dow from m.created_at)::int as day,
      extract(hour from m.created_at)::int as hour,
      count(*)::int as value
    from current_messages m
    where m.role = 'user'
    group by 1, 2
  ) counts on counts.day = hc.day and counts.hour = hc.hour
),
recent_questions as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'content', q.content,
        'createdAt', q.created_at,
        'answer', coalesce(a.content, 'Bot chưa có câu trả lời cho câu hỏi này.'),
        'hasFallback', q.no_answer is true
      )
      order by q.created_at desc
    ),
    '[]'::jsonb
  ) as data
  from (
    select m.conversation_id, m.content, m.created_at, m.no_answer
    from current_messages m
    where m.role = 'user'
    order by m.created_at desc
    limit 100
  ) q
  left join lateral (
    select reply.content
    from current_messages reply
    where reply.role = 'assistant'
      and reply.conversation_id = q.conversation_id
      and reply.created_at >= q.created_at
    order by reply.created_at asc
    limit 1
  ) a on true
)
select jsonb_build_object(
  'kpis', jsonb_build_object(
    'totalConversations', kv.current_conversations,
    'totalMessages', kv.current_messages,
    'fallbackCount', kv.current_fallbacks,
    'fallbackRate', case
      when kv.current_messages > 0 then round(((kv.current_fallbacks::numeric / kv.current_messages) * 100), 1)
      else 0
    end,
    'creditsUsed', kv.current_credits
  ),
  'comparison', jsonb_build_object(
    'conversations', jsonb_build_object(
      'current', kv.current_conversations,
      'previous', kv.previous_conversations,
      'delta', kv.current_conversations - kv.previous_conversations,
      'deltaPercent', case
        when kv.previous_conversations = 0 then null
        else round((((kv.current_conversations - kv.previous_conversations)::numeric / kv.previous_conversations) * 100), 1)
      end
    ),
    'messages', jsonb_build_object(
      'current', kv.current_messages,
      'previous', kv.previous_messages,
      'delta', kv.current_messages - kv.previous_messages,
      'deltaPercent', case
        when kv.previous_messages = 0 then null
        else round((((kv.current_messages - kv.previous_messages)::numeric / kv.previous_messages) * 100), 1)
      end
    ),
    'fallbacks', jsonb_build_object(
      'current', kv.current_fallbacks,
      'previous', kv.previous_fallbacks,
      'delta', kv.current_fallbacks - kv.previous_fallbacks,
      'deltaPercent', case
        when kv.previous_fallbacks = 0 then null
        else round((((kv.current_fallbacks - kv.previous_fallbacks)::numeric / kv.previous_fallbacks) * 100), 1)
      end
    ),
    'creditsUsed', jsonb_build_object(
      'current', kv.current_credits,
      'previous', kv.previous_credits,
      'delta', kv.current_credits - kv.previous_credits,
      'deltaPercent', case
        when kv.previous_credits = 0 then null
        else round((((kv.current_credits - kv.previous_credits)::numeric / kv.previous_credits) * 100), 1)
      end
    )
  ),
  'trends', trends.data,
  'heatmap', heatmap.data,
  'recentQuestions', recent_questions.data,
  'range', jsonb_build_object(
    'from', bounds.current_from,
    'to', bounds.current_to,
    'previousFrom', bounds.previous_from,
    'previousTo', bounds.previous_to
  )
)
from kpi_values kv
cross join trends
cross join heatmap
cross join recent_questions
cross join bounds;
$$;

commit;
