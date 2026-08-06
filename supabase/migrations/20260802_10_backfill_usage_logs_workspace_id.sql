-- Backfill: usage_logs truoc day duoc insert thieu workspace_id (chat route)
-- -> dashboard credit usage / messages thang nay = 0.
-- Gan workspace_id tu bot so huu.

UPDATE public.usage_logs ul
SET workspace_id = b.workspace_id
FROM public.bots b
WHERE ul.bot_id = b.id
  AND ul.workspace_id IS NULL
  AND b.workspace_id IS NOT NULL;
