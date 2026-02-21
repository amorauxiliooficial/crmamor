
-- Add status tracking columns to wa_messages
ALTER TABLE public.wa_messages
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Create index for faster status update lookups
CREATE INDEX IF NOT EXISTS idx_wa_messages_meta_message_id ON public.wa_messages (meta_message_id) WHERE meta_message_id IS NOT NULL;
