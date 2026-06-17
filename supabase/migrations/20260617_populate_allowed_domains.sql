-- Populate allowed_domains with the bot's domain value for existing rows only.
-- Application code (bot.service.ts:630) already sets allowed_domains on insert,
-- so no trigger is needed.

UPDATE public.bots
SET allowed_domains = ARRAY[domain]
WHERE allowed_domains = '{}'::text[] AND domain IS NOT NULL AND domain != '';
