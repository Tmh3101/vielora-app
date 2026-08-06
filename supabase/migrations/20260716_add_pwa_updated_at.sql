-- Add pwa_updated_at column to bots table
-- This column auto-updates ONLY when name or avatar_url changes,
-- used for PWA versioning to avoid false-positive update prompts.

ALTER TABLE public.bots
  ADD COLUMN pwa_updated_at timestamptz DEFAULT now() NOT NULL;

-- Trigger function: only update pwa_updated_at when branding fields change
CREATE OR REPLACE FUNCTION public.update_pwa_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    NEW.pwa_updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Attach trigger to bots table
CREATE TRIGGER update_bots_pwa_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pwa_updated_at_column();

-- Backfill existing rows so they have a valid pwa_updated_at
UPDATE public.bots SET pwa_updated_at = updated_at;
