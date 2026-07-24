CREATE TABLE IF NOT EXISTS public.zap_document_sync_jobs (
  mae_id UUID PRIMARY KEY REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  telefone_e164 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'complete', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zap_document_sync_jobs_pending
  ON public.zap_document_sync_jobs(next_attempt_at)
  WHERE status = 'pending';

ALTER TABLE public.zap_document_sync_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zap_document_sync_jobs FROM anon, authenticated;
GRANT ALL ON public.zap_document_sync_jobs TO service_role;

-- Inclui automaticamente mães já vindas do ZapResponder que ainda não
-- possuem fotos ou documentos visíveis no Amor.
INSERT INTO public.zap_document_sync_jobs (
  mae_id,
  telefone_e164,
  status,
  attempts,
  next_attempt_at
)
SELECT
  mae.id,
  mae.telefone_e164,
  'pending',
  0,
  now()
FROM public.mae_processo mae
WHERE mae.origem = 'Zap Responder'
  AND mae.contrato_assinado = true
  AND mae.telefone_e164 IS NOT NULL
  AND mae.link_documentos IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.mae_documentos documento
    WHERE documento.mae_id = mae.id
      AND coalesce(lower(documento.mime_type), '') NOT LIKE 'audio/%'
      AND coalesce(lower(documento.mime_type), '') NOT LIKE 'video/%'
      AND lower(documento.nome_arquivo) !~ '\.(aac|amr|flac|m4a|mp3|oga|ogg|opus|wav|wma|3gp|avi|mkv|mov|mp4|mpeg|mpg|webm)$'
  )
ON CONFLICT (mae_id) DO NOTHING;
