-- Sync local files with changes found on Supabase staging project
-- These changes were applied directly on Supabase and were missing from local SQL files.
-- Note: get_user_id_by_email function is already in 20260617_deploy_production_migration.sql

-- 1. Trigger to notify admin app when a new support ticket is created
--    Uses the built-in supabase_functions.http_request (powered by pg_net extension)
DROP TRIGGER IF EXISTS send_ticket_notification ON public.support_tickets;
CREATE TRIGGER send_ticket_notification
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://admin-portal.vielora.vn/api/webhooks/support-ticket',
    'POST',
    '{"Authorization":"Bearer <your_webhook_secret>"}',
    '{}',
    '5000'
  );
