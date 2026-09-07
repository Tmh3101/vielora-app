-- Prevent workspace slug from being "en" or "vi"
ALTER TABLE public.workspaces
ADD CONSTRAINT check_reserved_locale_slugs 
CHECK (slug NOT IN ('en', 'vi'));
