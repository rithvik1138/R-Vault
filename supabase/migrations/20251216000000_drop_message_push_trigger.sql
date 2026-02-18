-- Fix "schema net does not exist" when sending messages or group messages.
-- Push notification triggers call DB functions that use pg_net (schema "net").
-- If pg_net isn't enabled, the trigger fails and the INSERT is rolled back.
-- Dropping these triggers lets sends succeed. Enable pg_net (see README or
-- run 20251216000001_enable_pg_net.sql) then re-create triggers if you want DB-triggered push.

-- Drop known trigger names (in case they were created with these names).
DROP TRIGGER IF EXISTS on_new_message_push_notification ON public.messages;
DROP TRIGGER IF EXISTS on_new_group_message_push_notification ON public.group_messages;

-- Drop any *other* non-internal triggers on these tables that look like push/notify triggers.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT
      n.nspname AS table_schema,
      c.relname AS table_name,
      t.tgname  AS trigger_name,
      p.proname AS trigger_function
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE
      NOT t.tgisinternal
      AND n.nspname = 'public'
      AND c.relname IN ('messages', 'group_messages')
      AND (
        t.tgname ILIKE '%push%'
        OR p.proname ILIKE '%push%'
        OR p.proname IN ('notify_new_message', 'notify_new_group_message')
      )
  )
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I;',
      r.trigger_name,
      r.table_schema,
      r.table_name
    );
  END LOOP;
END $$;
