
-- Create conversation_events table for audit trail
CREATE TABLE public.conversation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'assumed', 'transfer', 'closed', 'reopened', 'status_change'
  from_agent_id uuid,
  to_agent_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_by_agent_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_events ENABLE ROW LEVEL SECURITY;

-- All authenticated can read (fila única)
CREATE POLICY "Authenticated users can view events"
ON public.conversation_events FOR SELECT
TO authenticated
USING (true);

-- All authenticated can insert events
CREATE POLICY "Authenticated users can create events"
ON public.conversation_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_events;
