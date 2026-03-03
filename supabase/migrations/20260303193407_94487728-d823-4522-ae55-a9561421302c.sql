
-- Add last_inbound_at to track SLA
ALTER TABLE public.wa_conversations 
  ADD COLUMN IF NOT EXISTS last_inbound_at timestamp with time zone;

-- Backfill last_inbound_at from last_message_at for existing rows
UPDATE public.wa_conversations SET last_inbound_at = last_message_at WHERE last_inbound_at IS NULL;

-- Create conversation_transfers table
CREATE TABLE public.conversation_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  from_agent_id uuid NOT NULL,
  to_agent_id uuid NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_transfers ENABLE ROW LEVEL SECURITY;

-- All authenticated agents can view transfers
CREATE POLICY "Authenticated users can view transfers"
  ON public.conversation_transfers FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated agent can create a transfer (fila única)
CREATE POLICY "Authenticated users can create transfers"
  ON public.conversation_transfers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime for transfers
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_transfers;
