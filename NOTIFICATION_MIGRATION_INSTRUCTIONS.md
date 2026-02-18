# Notification Migration Instructions

## Step-by-Step Guide to Enable Push Notifications

### Prerequisites
- ✅ Firebase service account secret already added to Supabase Edge Functions
- ✅ `pg_net` extension enabled in Supabase

### Step 1: Apply the Database Migration

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `yhxjbzxcbystwsojzqbl`

2. **Navigate to SQL Editor**
   - Click on **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Copy and Paste the Migration**
   - Open the file: `supabase/migrations/20251218000000_recreate_push_notification_triggers.sql`
   - Copy **ALL** the contents (lines 1-88)
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for success message: "Success. No rows returned"

### Step 2: Verify the Migration

Run this query in SQL Editor to verify triggers were created:

```sql
SELECT 
  trigger_name, 
  event_object_table, 
  action_statement 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%push_notification%';
```

You should see:
- `on_new_message_push_notification` on `messages` table
- `on_new_group_message_push_notification` on `group_messages` table

### Step 3: Deploy Edge Function (if not already deployed)

**Option A: Via Supabase Dashboard**
1. Go to **Edge Functions** → **notify-new-message**
2. Click **"Deploy"** or **"Redeploy"**

**Option B: Via CLI**
```bash
supabase functions deploy notify-new-message
```

### Step 4: Test Notifications

1. Open your app in **two different browsers** (or one browser + one phone)
2. Log in as **different users** in each
3. Grant notification permission when prompted
4. Send a message from User A to User B
5. User B should receive a push notification

### Troubleshooting

**If notifications don't work:**

1. **Check browser console** for errors
2. **Verify FCM tokens are saved:**
   ```sql
   SELECT user_id, token, updated_at FROM fcm_tokens;
   ```
3. **Check Edge Function logs:**
   - Supabase Dashboard → Edge Functions → notify-new-message → Logs
4. **Verify triggers are firing:**
   - Send a test message and check Edge Function logs for incoming requests

**Common Issues:**

- **"schema net does not exist"**: Run `20251216000001_enable_pg_net.sql` first
- **"Function not found"**: Edge Function not deployed
- **"No tokens"**: User hasn't granted notification permission or FCM token not saved
