-- Add reply_to_id and edited_at to messages (for reply threading and edit tracking)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
