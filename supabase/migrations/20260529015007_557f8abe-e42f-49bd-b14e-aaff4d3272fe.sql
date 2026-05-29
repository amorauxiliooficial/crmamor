
-- 1. mae_status_history
CREATE TABLE public.mae_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mae_id uuid NOT NULL,
  status_anterior text,
  status_novo text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid
);

CREATE INDEX idx_mae_status_history_mae_changed ON public.mae_status_history (mae_id, changed_at DESC);
CREATE INDEX idx_mae_status_history_status_novo ON public.mae_status_history (status_novo);

GRANT SELECT, INSERT ON public.mae_status_history TO authenticated;
GRANT ALL ON public.mae_status_history TO service_role;

ALTER TABLE public.mae_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all status history"
ON public.mae_status_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create status history"
ON public.mae_status_history FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Trigger em mae_processo para registrar mudança de status
CREATE OR REPLACE FUNCTION public.log_mae_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status_processo IS DISTINCT FROM OLD.status_processo THEN
    INSERT INTO public.mae_status_history (mae_id, status_anterior, status_novo, changed_at, changed_by)
    VALUES (NEW.id, OLD.status_processo::text, NEW.status_processo::text, now(), auth.uid());
    NEW.data_ultima_atualizacao = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mae_status_change
BEFORE UPDATE OF status_processo ON public.mae_processo
FOR EACH ROW
EXECUTE FUNCTION public.log_mae_status_change();

-- 3. Backfill: registro inicial para cada mãe existente
INSERT INTO public.mae_status_history (mae_id, status_anterior, status_novo, changed_at, changed_by)
SELECT id, NULL, status_processo::text, created_at, user_id FROM public.mae_processo;

-- 4. forecast_premissas (singleton)
CREATE TABLE public.forecast_premissas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_medio_padrao numeric NOT NULL DEFAULT 1800,
  taxa_pagamento_padrao numeric NOT NULL DEFAULT 0.75,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.forecast_premissas TO authenticated;
GRANT ALL ON public.forecast_premissas TO service_role;

ALTER TABLE public.forecast_premissas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view premissas"
ON public.forecast_premissas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage premissas"
ON public.forecast_premissas FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.forecast_premissas (ticket_medio_padrao, taxa_pagamento_padrao) VALUES (1800, 0.75);

-- 5. forecast_metas_fase
CREATE TABLE public.forecast_metas_fase (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_processo text NOT NULL UNIQUE,
  meta_valor numeric NOT NULL DEFAULT 0,
  meta_quantidade integer NOT NULL DEFAULT 0,
  ticket_medio numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.forecast_metas_fase TO authenticated;
GRANT ALL ON public.forecast_metas_fase TO service_role;

ALTER TABLE public.forecast_metas_fase ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view metas fase"
ON public.forecast_metas_fase FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage metas fase"
ON public.forecast_metas_fase FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed das fases do funil (zerado)
INSERT INTO public.forecast_metas_fase (status_processo, meta_valor, meta_quantidade) VALUES
  ('⚠️ Pendência Documental', 0, 0),
  ('🟡 Elegível (Análise Positiva)', 0, 0),
  ('⏳ Aguardando Análise INSS', 0, 0),
  ('✅ Aprovada', 0, 0),
  ('🤝 Renegociação', 0, 0),
  ('⚖️ Recurso / Judicial', 0, 0),
  ('💳 Inadimplência', 0, 0)
ON CONFLICT (status_processo) DO NOTHING;

-- Trigger updated_at
CREATE TRIGGER trg_forecast_metas_fase_updated_at
BEFORE UPDATE ON public.forecast_metas_fase
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_forecast_premissas_updated_at
BEFORE UPDATE ON public.forecast_premissas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
