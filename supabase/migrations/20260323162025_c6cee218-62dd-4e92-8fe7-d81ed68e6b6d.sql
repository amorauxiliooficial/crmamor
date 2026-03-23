CREATE TABLE public.conversation_phone_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  phone_value text NOT NULL,
  phone_type text NOT NULL DEFAULT 'e164' CHECK (phone_type IN ('e164', 'lid', 'raw')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(phone_value)
);

ALTER TABLE public.conversation_phone_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage aliases" ON public.conversation_phone_aliases FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_phone_aliases_value ON public.conversation_phone_aliases(phone_value);
CREATE INDEX idx_phone_aliases_conv ON public.conversation_phone_aliases(conversation_id);

INSERT INTO public.conversation_phone_aliases (conversation_id, phone_value, phone_type)
SELECT id, wa_phone, CASE WHEN wa_phone LIKE '%@lid' THEN 'lid' ELSE 'e164' END
FROM public.wa_conversations
ON CONFLICT (phone_value) DO NOTHING;