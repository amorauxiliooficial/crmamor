
-- Central Financeira (1 por mãe)
CREATE TABLE public.central_financeira (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mae_id UUID NOT NULL UNIQUE REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  numero_beneficio TEXT,
  banco_saque TEXT,
  agencia_saque TEXT,
  endereco_saque TEXT,
  data_saque DATE,
  horario_saque TEXT,
  observacao_saque TEXT,
  percentual_honorarios NUMERIC(5,2) DEFAULT 0,
  taxa_administrativa NUMERIC(12,2) DEFAULT 0,
  observacoes_valores_futuros TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.central_financeira TO authenticated;
GRANT ALL ON public.central_financeira TO service_role;

ALTER TABLE public.central_financeira ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth select central_financeira" ON public.central_financeira FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert central_financeira" ON public.central_financeira FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update central_financeira" ON public.central_financeira FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete central_financeira" ON public.central_financeira FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_central_financeira_updated
  BEFORE UPDATE ON public.central_financeira
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Parcelas do benefício (até 5 por central)
CREATE TABLE public.parcelas_beneficio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  central_id UUID NOT NULL REFERENCES public.central_financeira(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL CHECK (numero_parcela BETWEEN 1 AND 5),
  valor NUMERIC(12,2),
  data_parcela DATE,
  status TEXT NOT NULL DEFAULT 'prevista' CHECK (status IN ('liberada','prevista','recebida','a_confirmar')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(central_id, numero_parcela)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas_beneficio TO authenticated;
GRANT ALL ON public.parcelas_beneficio TO service_role;

ALTER TABLE public.parcelas_beneficio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all parcelas_beneficio" ON public.parcelas_beneficio FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_parcelas_beneficio_updated
  BEFORE UPDATE ON public.parcelas_beneficio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Boletos da Amor
CREATE TABLE public.boletos_amor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  central_id UUID NOT NULL REFERENCES public.central_financeira(id) ON DELETE CASCADE,
  numero_boleto TEXT,
  valor NUMERIC(12,2),
  vencimento DATE,
  status TEXT NOT NULL DEFAULT 'a_emitir' CHECK (status IN ('a_emitir','enviado','pago','vencido','cancelado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boletos_amor TO authenticated;
GRANT ALL ON public.boletos_amor TO service_role;

ALTER TABLE public.boletos_amor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all boletos_amor" ON public.boletos_amor FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_boletos_amor_updated
  BEFORE UPDATE ON public.boletos_amor
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Histórico de comunicados gerados
CREATE TABLE public.central_comunicados_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  central_id UUID NOT NULL REFERENCES public.central_financeira(id) ON DELETE CASCADE,
  mae_id UUID NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  user_id UUID,
  texto TEXT NOT NULL,
  valores_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.central_comunicados_historico TO authenticated;
GRANT ALL ON public.central_comunicados_historico TO service_role;

ALTER TABLE public.central_comunicados_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth select comunicados_historico" ON public.central_comunicados_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert comunicados_historico" ON public.central_comunicados_historico FOR INSERT TO authenticated WITH CHECK (true);

-- Log de alterações financeiras (auditoria, imutável)
CREATE TABLE public.central_alteracoes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  central_id UUID NOT NULL REFERENCES public.central_financeira(id) ON DELETE CASCADE,
  mae_id UUID NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  user_id UUID,
  entidade TEXT NOT NULL,
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.central_alteracoes_log TO authenticated;
GRANT ALL ON public.central_alteracoes_log TO service_role;

ALTER TABLE public.central_alteracoes_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth select alteracoes_log" ON public.central_alteracoes_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert alteracoes_log" ON public.central_alteracoes_log FOR INSERT TO authenticated WITH CHECK (true);

-- Índices úteis
CREATE INDEX idx_parcelas_beneficio_central ON public.parcelas_beneficio(central_id);
CREATE INDEX idx_boletos_amor_central ON public.boletos_amor(central_id);
CREATE INDEX idx_central_comunicados_central ON public.central_comunicados_historico(central_id, created_at DESC);
CREATE INDEX idx_central_log_central ON public.central_alteracoes_log(central_id, created_at DESC);
