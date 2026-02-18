# R-Vault - Private & Secure Chat

A secure messaging application where only you and your friends can see your conversations.

## Features

- **Private Messaging**: Send messages, photos, and videos securely
- **Friend System**: Connect with friends and manage your contacts
- **Real-time Chat**: Instant messaging with typing indicators
- **Profile Customization**: Update your username and avatar
- **Media Sharing**: Share photos and videos with end-to-end privacy

## Technology Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Supabase (Authentication, Database, Storage)

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Fix: `schema "net" does not exist` (Supabase)

If sending a message fails with `schema "net" does not exist`, your Supabase database still has push-notification triggers/functions that depend on the `pg_net` extension (schema `net`).

- **Option A (recommended to unblock messaging)**: apply the migration that drops the push triggers:
  - `supabase/migrations/20251216000000_drop_message_push_trigger.sql`

- **Option B (keep DB-triggered push notifications)**: enable the `pg_net` extension, which creates schema `net`:
  - Apply `supabase/migrations/20251216000001_enable_pg_net.sql`, or enable **pg_net** in Supabase Dashboard → Database → Extensions.

## Your Privacy, Our Priority

R-Vault ensures your conversations stay between you and your friends. No third parties, ever.
