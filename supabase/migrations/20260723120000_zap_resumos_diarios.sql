-- Mensagens de texto recebidas do ZapResponder para gerar um único resumo
-- diário por cliente. O conteúdo bruto é temporário e não fica exposto ao frontend.
CREATE TABLE IF NOT EXISTS public.zap_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_message_id TEXT NOT NULL UNIQUE,
  conversation_id TEXT,
  mae_id UUID REFERENCES public.mae_processo(id) ON DELETE SET NULL,
  telefone_e164 TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('customer', 'operation')),
  texto TEXT NOT NULL,
  attendant_name TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zap_conversation_messages_pending_idx
  ON public.zap_conversation_messages (occurred_at, telefone_e164)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS zap_conversation_messages_mae_idx
  ON public.zap_conversation_messages (mae_id, occurred_at DESC);

ALTER TABLE public.zap_conversation_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zap_conversation_messages FROM anon, authenticated;
GRANT ALL ON public.zap_conversation_messages TO service_role;

-- Controla idempotência e permite atualizar o mesmo resumo quando novas mensagens
-- chegam após o botão "Gerar resumo agora".
CREATE TABLE IF NOT EXISTS public.zap_daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mae_id UUID NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  telefone_e164 TEXT NOT NULL,
  summary_date DATE NOT NULL,
  observation_id UUID NOT NULL REFERENCES public.mae_observacoes(id) ON DELETE CASCADE,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT zap_daily_summaries_phone_date_unique
    UNIQUE (telefone_e164, summary_date)
);

CREATE INDEX IF NOT EXISTS zap_daily_summaries_mae_date_idx
  ON public.zap_daily_summaries (mae_id, summary_date DESC);

ALTER TABLE public.zap_daily_summaries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zap_daily_summaries FROM anon, authenticated;
GRANT ALL ON public.zap_daily_summaries TO service_role;

DROP TRIGGER IF EXISTS trg_zap_daily_summaries_updated_at
  ON public.zap_daily_summaries;
CREATE TRIGGER trg_zap_daily_summaries_updated_at
  BEFORE UPDATE ON public.zap_daily_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Registros automáticos podem ser revisados pela equipe.
DROP POLICY IF EXISTS "Staff can update ZapResponder AI summaries"
  ON public.mae_observacoes;
CREATE POLICY "Staff can update ZapResponder AI summaries"
  ON public.mae_observacoes
  FOR UPDATE TO authenticated
  USING (
    autor_id IS NULL
    AND autor_nome = 'ZapResponder · Resumo IA'
    AND public.is_staff(auth.uid())
  )
  WITH CHECK (
    autor_id IS NULL
    AND autor_nome = 'ZapResponder · Resumo IA'
    AND public.is_staff(auth.uid())
  );
