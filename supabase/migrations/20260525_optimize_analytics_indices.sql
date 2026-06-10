-- Optimize bot analytics lookups and move aggregation into PostgreSQL.

CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages (created_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages (conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversations_bot_id
  ON public.conversations (bot_id);

CREATE INDEX IF NOT EXISTS idx_usage_logs_bot_action_created_at
  ON public.usage_logs (bot_id, action, created_at);

CREATE OR REPLACE FUNCTION public.get_bot_analytics_v2(
  p_bot_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH bounds AS (
  SELECT
    p_start_date AS current_from,
    p_end_date AS current_to,
    p_start_date - INTERVAL '1 millisecond' AS previous_to,
    (p_start_date - INTERVAL '1 millisecond') - (p_end_date - p_start_date) AS previous_from
),
current_conversations AS (
  SELECT c.id, c.started_at
  FROM public.conversations c, bounds b
  WHERE c.bot_id = p_bot_id
    AND c.started_at >= b.current_from
    AND c.started_at <= b.current_to
),
previous_conversations AS (
  SELECT c.id, c.started_at
  FROM public.conversations c, bounds b
  WHERE c.bot_id = p_bot_id
    AND c.started_at >= b.previous_from
    AND c.started_at <= b.previous_to
),
current_messages AS (
  SELECT m.id, m.conversation_id, m.content, m.created_at, m.role, m.no_answer
  FROM public.messages m
  INNER JOIN public.conversations c ON c.id = m.conversation_id
  CROSS JOIN bounds b
  WHERE c.bot_id = p_bot_id
    AND m.created_at >= b.current_from
    AND m.created_at <= b.current_to
),
previous_messages AS (
  SELECT m.id, m.conversation_id, m.created_at, m.role, m.no_answer
  FROM public.messages m
  INNER JOIN public.conversations c ON c.id = m.conversation_id
  CROSS JOIN bounds b
  WHERE c.bot_id = p_bot_id
    AND m.created_at >= b.previous_from
    AND m.created_at <= b.previous_to
),
current_usage AS (
  SELECT COALESCE(SUM(COALESCE(ul.count, 1)), 0)::int AS value
  FROM public.usage_logs ul, bounds b
  WHERE ul.bot_id = p_bot_id
    AND ul.action = 'chat_message'
    AND ul.created_at >= b.current_from
    AND ul.created_at <= b.current_to
),
previous_usage AS (
  SELECT COALESCE(SUM(COALESCE(ul.count, 1)), 0)::int AS value
  FROM public.usage_logs ul, bounds b
  WHERE ul.bot_id = p_bot_id
    AND ul.action = 'chat_message'
    AND ul.created_at >= b.previous_from
    AND ul.created_at <= b.previous_to
),
kpi_values AS (
  SELECT
    (SELECT COUNT(*)::int FROM current_conversations) AS current_conversations,
    (SELECT COUNT(*)::int FROM previous_conversations) AS previous_conversations,
    (SELECT COUNT(*)::int FROM current_messages WHERE role = 'user') AS current_messages,
    (SELECT COUNT(*)::int FROM previous_messages WHERE role = 'user') AS previous_messages,
    (SELECT COUNT(*)::int FROM current_messages WHERE role = 'user' AND no_answer IS TRUE) AS current_fallbacks,
    (SELECT COUNT(*)::int FROM previous_messages WHERE role = 'user' AND no_answer IS TRUE) AS previous_fallbacks,
    (SELECT value FROM current_usage) AS current_credits,
    (SELECT value FROM previous_usage) AS previous_credits
),
trend_buckets AS (
  SELECT bucket_start
  FROM bounds b,
    generate_series(b.current_from, b.current_to, INTERVAL '1 day') AS bucket_start
),
trends AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(tb.bucket_start, 'DD/MM'),
        'messages', (
          SELECT COUNT(*)::int
          FROM current_messages m, bounds b
          WHERE m.role = 'user'
            AND m.created_at >= tb.bucket_start
            AND m.created_at < LEAST(tb.bucket_start + INTERVAL '1 day', b.current_to + INTERVAL '1 millisecond')
        ),
        'conversations', (
          SELECT COUNT(*)::int
          FROM current_conversations c, bounds b
          WHERE c.started_at >= tb.bucket_start
            AND c.started_at < LEAST(tb.bucket_start + INTERVAL '1 day', b.current_to + INTERVAL '1 millisecond')
        )
      )
      ORDER BY tb.bucket_start
    ),
    '[]'::jsonb
  ) AS data
  FROM trend_buckets tb
),
heatmap_cells AS (
  SELECT day_value AS day, hour_value AS hour
  FROM generate_series(0, 6) AS day_value
  CROSS JOIN generate_series(0, 23) AS hour_value
),
heatmap AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'day', hc.day,
        'hour', hc.hour,
        'value', COALESCE(counts.value, 0)
      )
      ORDER BY hc.day, hc.hour
    ),
    '[]'::jsonb
  ) AS data
  FROM heatmap_cells hc
  LEFT JOIN (
    SELECT
      EXTRACT(DOW FROM m.created_at)::int AS day,
      EXTRACT(HOUR FROM m.created_at)::int AS hour,
      COUNT(*)::int AS value
    FROM current_messages m
    WHERE m.role = 'user'
    GROUP BY 1, 2
  ) counts ON counts.day = hc.day AND counts.hour = hc.hour
),
recent_questions AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'content', q.content,
        'createdAt', q.created_at,
        'answer', COALESCE(a.content, 'Bot chưa có câu trả lời cho câu hỏi này.'),
        'hasFallback', q.no_answer IS TRUE
      )
      ORDER BY q.created_at DESC
    ),
    '[]'::jsonb
  ) AS data
  FROM (
    SELECT m.conversation_id, m.content, m.created_at, m.no_answer
    FROM current_messages m
    WHERE m.role = 'user'
    ORDER BY m.created_at DESC
    LIMIT 100
  ) q
  LEFT JOIN LATERAL (
    SELECT reply.content
    FROM current_messages reply
    WHERE reply.role = 'assistant'
      AND reply.conversation_id = q.conversation_id
      AND reply.created_at >= q.created_at
    ORDER BY reply.created_at ASC
    LIMIT 1
  ) a ON TRUE
)
SELECT jsonb_build_object(
  'kpis', jsonb_build_object(
    'totalConversations', kv.current_conversations,
    'totalMessages', kv.current_messages,
    'fallbackCount', kv.current_fallbacks,
    'fallbackRate', CASE
      WHEN kv.current_messages > 0 THEN ROUND(((kv.current_fallbacks::numeric / kv.current_messages) * 100), 1)
      ELSE 0
    END,
    'creditsUsed', kv.current_credits
  ),
  'comparison', jsonb_build_object(
    'conversations', jsonb_build_object(
      'current', kv.current_conversations,
      'previous', kv.previous_conversations,
      'delta', kv.current_conversations - kv.previous_conversations,
      'deltaPercent', CASE
        WHEN kv.previous_conversations = 0 THEN NULL
        ELSE ROUND((((kv.current_conversations - kv.previous_conversations)::numeric / kv.previous_conversations) * 100), 1)
      END
    ),
    'messages', jsonb_build_object(
      'current', kv.current_messages,
      'previous', kv.previous_messages,
      'delta', kv.current_messages - kv.previous_messages,
      'deltaPercent', CASE
        WHEN kv.previous_messages = 0 THEN NULL
        ELSE ROUND((((kv.current_messages - kv.previous_messages)::numeric / kv.previous_messages) * 100), 1)
      END
    ),
    'fallbacks', jsonb_build_object(
      'current', kv.current_fallbacks,
      'previous', kv.previous_fallbacks,
      'delta', kv.current_fallbacks - kv.previous_fallbacks,
      'deltaPercent', CASE
        WHEN kv.previous_fallbacks = 0 THEN NULL
        ELSE ROUND((((kv.current_fallbacks - kv.previous_fallbacks)::numeric / kv.previous_fallbacks) * 100), 1)
      END
    ),
    'creditsUsed', jsonb_build_object(
      'current', kv.current_credits,
      'previous', kv.previous_credits,
      'delta', kv.current_credits - kv.previous_credits,
      'deltaPercent', CASE
        WHEN kv.previous_credits = 0 THEN NULL
        ELSE ROUND((((kv.current_credits - kv.previous_credits)::numeric / kv.previous_credits) * 100), 1)
      END
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
FROM kpi_values kv
CROSS JOIN trends
CROSS JOIN heatmap
CROSS JOIN recent_questions
CROSS JOIN bounds;
$$;
