-- Enable pg_net so schema "net" exists (used by notify_new_message / notify_new_group_message).
-- Run this in Supabase SQL Editor, or enable "pg_net" in Dashboard → Database → Extensions.
-- After this, re-create the push notification triggers if you dropped them so push works again.

-- In Supabase, enabling `pg_net` creates the `net` schema (e.g. `net.http_post`).
CREATE EXTENSION IF NOT EXISTS pg_net;
