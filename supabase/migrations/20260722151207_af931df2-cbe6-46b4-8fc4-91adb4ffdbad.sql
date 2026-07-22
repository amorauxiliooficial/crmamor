
CREATE TABLE IF NOT EXISTS public.mae_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mae_id UUID REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  telefone_e164 TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ZapResponder',
  source_message_id TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  storage_path TEXT NOT NULL,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mae_documentos_source_message_unique UNIQUE (source, source_message_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mae_documentos TO authenticated;
GRANT ALL ON public.mae_documentos TO service_role;

CREATE INDEX IF NOT EXISTS mae_documentos_mae_id_idx
  ON public.mae_documentos(mae_id);

CREATE INDEX IF NOT EXISTS mae_documentos_telefone_pendente_idx
  ON public.mae_documentos(telefone_e164)
  WHERE mae_id IS NULL;

ALTER TABLE public.mae_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mae_documentos_staff_select" ON public.mae_documentos;
CREATE POLICY "mae_documentos_staff_select"
  ON public.mae_documentos FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "documentos_clientes_staff_select" ON storage.objects;
CREATE POLICY "documentos_clientes_staff_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-clientes' AND public.is_staff(auth.uid()));
