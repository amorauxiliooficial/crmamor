-- Add channel transfer columns to conversation_transfers
ALTER TABLE public.conversation_transfers
  ADD COLUMN IF NOT EXISTS from_channel_code text,
  ADD COLUMN IF NOT EXISTS to_channel_code text,
  ADD COLUMN IF NOT EXISTS from_instance_id uuid REFERENCES public.whatsapp_instances(id),
  ADD COLUMN IF NOT EXISTS to_instance_id uuid REFERENCES public.whatsapp_instances(id),
  ADD COLUMN IF NOT EXISTS triggered_by uuid;

-- Make from_agent_id and to_agent_id nullable (channel transfers don't need agent IDs)
ALTER TABLE public.conversation_transfers
  ALTER COLUMN from_agent_id DROP NOT NULL,
  ALTER COLUMN to_agent_id DROP NOT NULL;