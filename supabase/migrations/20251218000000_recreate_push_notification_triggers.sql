-- Recreate push notification triggers that call the notify-new-message Edge Function.
-- This requires pg_net to be enabled (run 20251216000001_enable_pg_net.sql first).
-- IMPORTANT: The Edge Function has verify_jwt = true, so we need to pass the anon key.
-- Replace YOUR_ANON_KEY below with your actual anon key from Supabase Dashboard → Settings → API.

-- Function to call the Edge Function via HTTP
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  anon_key TEXT;
BEGIN
  -- Edge Function URL
  edge_function_url := 'https://yhxjbzxcbystwsojzqbl.supabase.co/functions/v1/notify-new-message';
  
  -- Anon key (replace with your actual anon key from Supabase Dashboard → Settings → API)
  -- TODO: Store this securely using Supabase Vault or environment variables
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeGpienhjYnlzdHdzb2p6cWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTE0OTksImV4cCI6MjA4MTAyNzQ5OX0.wthDC224FqpO3jh5pOD8FUguw1kljjMubb2VJ8LtH7Q';
  
  -- Call Edge Function asynchronously (non-blocking)
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'sender_id', NEW.sender_id,
        'receiver_id', NEW.receiver_id,
        'content', NEW.content
      )
    )
  );
  
  RETURN NEW;
END;
$$;

-- Function for group messages
CREATE OR REPLACE FUNCTION public.notify_new_group_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  anon_key TEXT;
BEGIN
  edge_function_url := 'https://yhxjbzxcbystwsojzqbl.supabase.co/functions/v1/notify-new-message';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeGpienhjYnlzdHdzb2p6cWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTE0OTksImV4cCI6MjA4MTAyNzQ5OX0.wthDC224FqpO3jh5pOD8FUguw1kljjMubb2VJ8LtH7Q';
  
  -- For group messages, we'd need a different Edge Function or modify this one
  -- For now, we'll use the same function but with group_id
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'sender_id', NEW.sender_id,
        'receiver_id', NULL, -- Group messages don't have a single receiver
        'content', NEW.content,
        'group_id', NEW.group_id
      )
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_new_message_push_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

CREATE TRIGGER on_new_group_message_push_notification
  AFTER INSERT ON public.group_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_group_message();
