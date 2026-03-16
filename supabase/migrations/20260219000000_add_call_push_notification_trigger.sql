-- Push notification trigger for incoming calls.
-- Requires pg_net to be enabled (see 20251216000001_enable_pg_net.sql).
-- IMPORTANT: Edge Function has verify_jwt = true, so we pass the anon key.

CREATE OR REPLACE FUNCTION public.notify_incoming_call()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  anon_key TEXT;
BEGIN
  edge_function_url := 'https://yhxjbzxcbystwsojzqbl.supabase.co/functions/v1/notify-incoming-call';

  -- Anon key for calling the Edge Function (Dashboard → Settings → API)
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeGpienhjYnlzdHdzb2p6cWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTE0OTksImV4cCI6MjA4MTAyNzQ5OX0.wthDC224FqpO3jh5pOD8FUguw1kljjMubb2VJ8LtH7Q';

  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'caller_id', NEW.caller_id,
        'receiver_id', NEW.receiver_id,
        'call_type', NEW.call_type
      )
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_call_push_notification ON public.calls;

CREATE TRIGGER on_new_call_push_notification
  AFTER INSERT ON public.calls
  FOR EACH ROW
  WHEN (NEW.status = 'ringing')
  EXECUTE FUNCTION public.notify_incoming_call();

