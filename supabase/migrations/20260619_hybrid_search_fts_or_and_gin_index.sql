-- ============================================================================
-- PART 1: Add GIN index on documents.fts for full-text search performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS documents_fts_idx ON public.documents USING gin (fts);


-- ============================================================================
-- PART 2: Rewrite hybrid_search function
--
-- Changes:
--   1. AND → OR in FTS matching via replace(' & ', ' | ') so documents
--      matching ANY query term are considered (fixes "FTS always returns 0")
--   2. plainto_tsquery → websearch_to_tsquery (phrase / OR / NOT support)
--   3. Return actual cosine similarity as "similarity" column instead of
--      RRF score (fixes semantic mismatch — the consumer needs real
--      similarity for thresholding, not the opaque RRF rank score)
--   4. rrf_k 60 → 20 so rank differences produce meaningfully different
--      fusion scores
-- ============================================================================

DROP FUNCTION IF EXISTS public.hybrid_search(text, vector, integer, double precision, double precision, uuid);

CREATE OR REPLACE FUNCTION public.hybrid_search(
  query_text text,
  query_embedding vector,
  match_count integer DEFAULT 5,
  full_text_weight double precision DEFAULT 1.0,
  semantic_weight double precision DEFAULT 1.0,
  p_bot_id uuid DEFAULT NULL::uuid
) RETURNS TABLE(
  id uuid,
  bot_id uuid,
  content text,
  metadata jsonb,
  similarity double precision,
  source_type text,
  resolved_url text
) LANGUAGE plpgsql
AS $function$
declare
  rrf_k constant integer := 20;
  fts_query tsquery;
begin
  begin
    fts_query := replace(
      websearch_to_tsquery('simple', query_text)::text,
      ' & ',
      ' | '
    )::tsquery;
  exception when others then
    fts_query := null;
  end;

  return query
  with full_text_results as (
    select
      d.id,
      row_number() over (order by ts_rank_cd(d.fts, fts_query) desc) as rank_ix
    from public.documents d
    where
      (p_bot_id is null or d.bot_id = p_bot_id)
      and fts_query is not null
      and d.fts @@ fts_query
    limit 20
  ),
  semantic_results as (
    select
      d.id,
      1 - (d.embedding <=> query_embedding) as semantic_similarity,
      row_number() over (order by d.embedding <=> query_embedding) as rank_ix
    from public.documents d
    where
      (p_bot_id is null or d.bot_id = p_bot_id)
      and d.embedding is not null
    limit 20
  ),
  rrf_results as (
    select
      coalesce(ft.id, sem.id) as id,
      sem.semantic_similarity,
      (
        coalesce(full_text_weight * (1.0 / (rrf_k + ft.rank_ix)), 0.0) +
        coalesce(semantic_weight * (1.0 / (rrf_k + sem.rank_ix)), 0.0)
      ) as rrf_score
    from full_text_results ft
    full outer join semantic_results sem on ft.id = sem.id
  ),
  top_matches as (
    select
      rrf.id,
      rrf.semantic_similarity,
      rrf.rrf_score
    from rrf_results rrf
    order by rrf.rrf_score desc
    limit match_count
  )
  select
    d.id,
    d.bot_id,
    d.content,
    d.metadata,
    coalesce(tm.semantic_similarity, 0.0) as similarity,
    coalesce(p.source_type, 'website') as source_type,
    p.url as resolved_url
  from top_matches tm
  join public.documents d on d.id = tm.id
  left join public.pages p on d.bot_id = p.bot_id and (d.metadata->>'url') = p.url;
end;
$function$;
