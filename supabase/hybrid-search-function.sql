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
  rrf_k constant integer := 60;
begin
  return query
  with full_text_results as (
    select
      d.id,
      row_number() over (order by ts_rank_cd(d.fts, plainto_tsquery('simple', query_text)) desc) as rank_ix
    from public.documents d
    where 
      (p_bot_id is null or d.bot_id = p_bot_id)
      and d.fts @@ plainto_tsquery('simple', query_text)
    limit 20
  ),
  semantic_results as (
    select
      d.id,
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
      rrf.rrf_score
    from rrf_results rrf
    order by rrf.rrf_score desc
    limit match_count
  )
  -- Lệnh SELECT cuối cùng thực hiện JOIN tối ưu để lấy thông tin nguồn trang/file
  select
    d.id,
    d.bot_id,
    d.content,
    d.metadata,
    tm.rrf_score as similarity,
    coalesce(p.source_type, 'website') as source_type, -- Fallback mặc định là website nếu không tìm thấy liên kết trang
    p.url as resolved_url
  from top_matches tm
  join public.documents d on d.id = tm.id
  left join public.pages p on d.bot_id = p.bot_id and (d.metadata->>'url') = p.url;
end;
$function$;