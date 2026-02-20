
-- 1. Add normalized phone column to mae_processo
ALTER TABLE public.mae_processo
  ADD COLUMN IF NOT EXISTS telefone_e164 text;

CREATE INDEX IF NOT EXISTS idx_mae_processo_telefone_e164 
  ON public.mae_processo (telefone_e164);

-- 2. Create timeline_events table for cross-module integration
CREATE TABLE public.timeline_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mae_id uuid REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  conversation_id text,
  event_type text NOT NULL,
  title text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_timeline_events_mae_id ON public.timeline_events (mae_id);
CREATE INDEX idx_timeline_events_conversation_id ON public.timeline_events (conversation_id);
CREATE INDEX idx_timeline_events_created_at ON public.timeline_events (created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all timeline events"
  ON public.timeline_events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create timeline events"
  ON public.timeline_events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can delete timeline events"
  ON public.timeline_events FOR DELETE
  USING (true);

-- 4. Add last_contact_at to mae_processo for quick access
ALTER TABLE public.mae_processo
  ADD COLUMN IF NOT EXISTS last_contact_at timestamp with time zone;
