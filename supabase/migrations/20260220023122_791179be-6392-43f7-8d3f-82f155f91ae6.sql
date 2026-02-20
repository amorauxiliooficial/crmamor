
-- Table: mother_contacts - phone/whatsapp contacts for each mother
CREATE TABLE public.mother_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mae_id UUID NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (contact_type IN ('whatsapp', 'phone', 'email')),
  value_e164 TEXT NOT NULL,
  wa_id TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookup by phone/wa_id
CREATE INDEX idx_mother_contacts_value ON public.mother_contacts(value_e164) WHERE active = true;
CREATE INDEX idx_mother_contacts_wa_id ON public.mother_contacts(wa_id) WHERE wa_id IS NOT NULL AND active = true;
CREATE INDEX idx_mother_contacts_mae_id ON public.mother_contacts(mae_id);

-- RLS
ALTER TABLE public.mother_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all contacts"
  ON public.mother_contacts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create contacts"
  ON public.mother_contacts FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts"
  ON public.mother_contacts FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete contacts"
  ON public.mother_contacts FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_mother_contacts_updated_at
  BEFORE UPDATE ON public.mother_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: assignment_events - audit trail for attendant changes
CREATE TABLE public.assignment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mae_id UUID REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  conversation_id TEXT,
  from_user_id UUID,
  to_user_id UUID,
  reason TEXT,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_assignment_events_mae_id ON public.assignment_events(mae_id);
CREATE INDEX idx_assignment_events_created_at ON public.assignment_events(created_at DESC);

-- RLS
ALTER TABLE public.assignment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all assignment events"
  ON public.assignment_events FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create assignment events"
  ON public.assignment_events FOR INSERT WITH CHECK (true);

-- Migrate existing phones from mae_processo.telefone_e164 into mother_contacts
INSERT INTO public.mother_contacts (mae_id, contact_type, value_e164, is_primary, active)
SELECT id, 'whatsapp', telefone_e164, true, true
FROM public.mae_processo
WHERE telefone_e164 IS NOT NULL AND telefone_e164 != '';
