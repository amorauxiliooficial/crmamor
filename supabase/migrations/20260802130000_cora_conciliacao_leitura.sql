-- Conciliação bancária Cora em modo de leitura.
-- Os lançamentos são mantidos separados das parcelas/despesas até validação humana.
CREATE TABLE IF NOT EXISTS public.cora_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cora_entry_id text NOT NULL UNIQUE,
  tipo text NOT NULL CHECK (tipo IN ('CREDIT', 'DEBIT', 'BLOCK', 'UNBLOCK')),
  valor_centavos bigint NOT NULL CHECK (valor_centavos >= 0),
  ocorrido_em timestamptz NOT NULL,
  transaction_id text,
  transaction_type text,
  descricao text,
  contraparte_nome text,
  contraparte_documento text,
  dados_originais jsonb NOT NULL DEFAULT '{}'::jsonb,
  situacao text NOT NULL DEFAULT 'pendente'
    CHECK (situacao IN ('pendente', 'sugerido', 'validado', 'ignorado')),
  mae_sugerida_id uuid REFERENCES public.mae_processo(id) ON DELETE SET NULL,
  parcela_sugerida_id uuid REFERENCES public.parcelas_pagamento(id) ON DELETE SET NULL,
  despesa_sugerida_id uuid REFERENCES public.despesas(id) ON DELETE SET NULL,
  confianca smallint CHECK (confianca BETWEEN 0 AND 100),
  motivos jsonb NOT NULL DEFAULT '[]'::jsonb,
  validado_por uuid,
  validado_em timestamptz,
  sincronizado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cora_movimentacoes_ocorrido_idx
  ON public.cora_movimentacoes (ocorrido_em DESC);
CREATE INDEX IF NOT EXISTS cora_movimentacoes_situacao_idx
  ON public.cora_movimentacoes (situacao, tipo);
CREATE INDEX IF NOT EXISTS cora_movimentacoes_documento_idx
  ON public.cora_movimentacoes (contraparte_documento);

CREATE TABLE IF NOT EXISTS public.cora_sincronizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  status text NOT NULL DEFAULT 'executando'
    CHECK (status IN ('executando', 'sucesso', 'erro')),
  periodo_inicio date,
  periodo_fim date,
  importados integer NOT NULL DEFAULT 0,
  atualizados integer NOT NULL DEFAULT 0,
  mensagem text,
  executado_por uuid
);

ALTER TABLE public.cora_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cora_sincronizacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cora_movimentacoes_select ON public.cora_movimentacoes;
CREATE POLICY cora_movimentacoes_select ON public.cora_movimentacoes
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS cora_movimentacoes_update ON public.cora_movimentacoes;
CREATE POLICY cora_movimentacoes_update ON public.cora_movimentacoes
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS cora_sincronizacoes_select ON public.cora_sincronizacoes;
CREATE POLICY cora_sincronizacoes_select ON public.cora_sincronizacoes
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS update_cora_movimentacoes_updated_at ON public.cora_movimentacoes;
CREATE TRIGGER update_cora_movimentacoes_updated_at
  BEFORE UPDATE ON public.cora_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

