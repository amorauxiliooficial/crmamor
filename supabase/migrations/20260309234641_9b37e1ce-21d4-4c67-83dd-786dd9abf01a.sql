
-- Create channels table
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'whatsapp',
  display_name text NOT NULL,
  phone_e164 text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view channels"
  ON public.channels FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage channels"
  ON public.channels FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed two channels
INSERT INTO public.channels (code, type, display_name, phone_e164, active) VALUES
  ('official', 'whatsapp_cloud_api', 'WhatsApp Oficial', NULL, true),
  ('web_manual_team', 'whatsapp_web', 'WhatsApp Web Manual (Equipe)', NULL, true);

-- Add active_channel_code to wa_conversations (replace old 'channel' column)
ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS active_channel_code text NOT NULL DEFAULT 'official',
  ADD COLUMN IF NOT EXISTS lead_stage text,
  ADD COLUMN IF NOT EXISTS lead_data jsonb DEFAULT '{}'::jsonb;

-- Add updated_at trigger to channels
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
