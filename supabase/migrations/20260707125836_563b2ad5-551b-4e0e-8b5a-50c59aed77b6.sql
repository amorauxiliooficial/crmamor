
-- 1. Add fields to boletos_amor
ALTER TABLE public.boletos_amor
  ADD COLUMN IF NOT EXISTS percentual_comissao numeric,
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parcela_id uuid REFERENCES public.parcelas_pagamento(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boletos_amor_parcela ON public.boletos_amor(parcela_id);

-- 2. Helper: map boleto status -> parcela status
CREATE OR REPLACE FUNCTION public.boleto_status_to_parcela(_boleto_status text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _boleto_status
    WHEN 'pago' THEN 'pago'
    WHEN 'vencido' THEN 'inadimplente'
    ELSE 'pendente'
  END
$$;

-- 3. Ensure pagamentos_mae exists for a mae; returns id
CREATE OR REPLACE FUNCTION public.ensure_pagamento_mae(_mae_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pag_id uuid;
  _user_id uuid;
BEGIN
  SELECT id INTO _pag_id FROM public.pagamentos_mae WHERE mae_id = _mae_id ORDER BY created_at LIMIT 1;
  IF _pag_id IS NOT NULL THEN
    RETURN _pag_id;
  END IF;

  SELECT user_id INTO _user_id FROM public.mae_processo WHERE id = _mae_id;
  IF _user_id IS NULL THEN
    SELECT user_id INTO _user_id FROM public.user_roles LIMIT 1;
  END IF;

  INSERT INTO public.pagamentos_mae (mae_id, user_id, tipo_pagamento, total_parcelas, percentual_comissao)
  VALUES (_mae_id, _user_id, 'parcelado', 0, 10)
  RETURNING id INTO _pag_id;

  RETURN _pag_id;
END;
$$;

-- 4. Recalculate pagamentos_mae totals from linked parcelas
CREATE OR REPLACE FUNCTION public.recalc_pagamento_totais(_pagamento_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.pagamentos_mae p
  SET total_parcelas = COALESCE(sub.qtd, 0),
      valor_total = sub.total
  FROM (
    SELECT COUNT(*)::int AS qtd, SUM(valor) AS total
    FROM public.parcelas_pagamento
    WHERE pagamento_id = _pagamento_id
  ) sub
  WHERE p.id = _pagamento_id;
$$;

-- 5. Generate commission expense (mirrors client-side processarComissaoParcela)
CREATE OR REPLACE FUNCTION public.gerar_comissao_parcela(_parcela_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _valor numeric;
  _perc numeric;
  _forn_id uuid;
  _forn_nome text;
  _mae_id uuid;
  _mae_nome text;
  _numero int;
  _user_id uuid;
  _valor_com numeric;
  _existing_id uuid;
  _due date;
  _today date := current_date;
BEGIN
  SELECT pp.valor, pp.numero_parcela, pm.mae_id, pm.user_id
    INTO _valor, _numero, _mae_id, _user_id
  FROM public.parcelas_pagamento pp
  JOIN public.pagamentos_mae pm ON pm.id = pp.pagamento_id
  WHERE pp.id = _parcela_id;

  IF _valor IS NULL OR _valor <= 0 THEN RETURN; END IF;

  -- Get commission info from the linked boleto (if any)
  SELECT b.percentual_comissao, b.fornecedor_id
    INTO _perc, _forn_id
  FROM public.boletos_amor b
  WHERE b.parcela_id = _parcela_id
  LIMIT 1;

  _perc := COALESCE(_perc, 10);
  _valor_com := round(_valor * _perc) / 100.0;

  -- Update parcela's commission value
  UPDATE public.parcelas_pagamento SET valor_comissao = _valor_com WHERE id = _parcela_id;

  -- Skip if fornecedor not defined (no partner to pay)
  IF _forn_id IS NULL THEN RETURN; END IF;

  SELECT id INTO _existing_id FROM public.despesas WHERE parcela_origem_id = _parcela_id LIMIT 1;
  IF _existing_id IS NOT NULL THEN RETURN; END IF;

  SELECT nome INTO _forn_nome FROM public.fornecedores WHERE id = _forn_id;
  SELECT nome_mae INTO _mae_nome FROM public.mae_processo WHERE id = _mae_id;

  IF extract(day FROM _today)::int > 5 THEN
    _due := (date_trunc('month', _today) + interval '1 month' + interval '4 days')::date;
  ELSE
    _due := (date_trunc('month', _today) + interval '4 days')::date;
  END IF;

  INSERT INTO public.despesas (
    user_id, categoria, descricao, valor, data_vencimento, status, recorrencia,
    fornecedor, fornecedor_id, observacoes, parcela_origem_id
  ) VALUES (
    _user_id, 'comissao_parceiro',
    'Comissão ' || _perc || '% — ' || COALESCE(_mae_nome, '') || ' (' || _numero || 'ª parcela)',
    _valor_com, _due, 'pendente', 'unica',
    COALESCE(_forn_nome, 'Parceiro'), _forn_id,
    'Comissão automática de ' || _perc || '% sobre parcela #' || _numero || ' (R$ ' || _valor::text || ') — ' || COALESCE(_mae_nome, ''),
    _parcela_id
  );
END;
$$;

-- 6. Main sync trigger: boletos_amor -> parcelas_pagamento
CREATE OR REPLACE FUNCTION public.sync_boleto_to_parcela()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _mae_id uuid;
  _pag_id uuid;
  _parc_id uuid;
  _next_num int;
  _new_status text;
BEGIN
  SELECT mae_id INTO _mae_id FROM public.central_financeira WHERE id = NEW.central_id;
  IF _mae_id IS NULL THEN RETURN NEW; END IF;

  -- Cancelled boleto: drop the linked parcela (if any) and stop
  IF NEW.status = 'cancelado' THEN
    IF NEW.parcela_id IS NOT NULL THEN
      DELETE FROM public.despesas WHERE parcela_origem_id = NEW.parcela_id;
      SELECT pagamento_id INTO _pag_id FROM public.parcelas_pagamento WHERE id = NEW.parcela_id;
      DELETE FROM public.parcelas_pagamento WHERE id = NEW.parcela_id;
      IF _pag_id IS NOT NULL THEN PERFORM public.recalc_pagamento_totais(_pag_id); END IF;
      NEW.parcela_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  _pag_id := public.ensure_pagamento_mae(_mae_id);
  _new_status := public.boleto_status_to_parcela(NEW.status);

  IF NEW.parcela_id IS NULL THEN
    SELECT COALESCE(MAX(numero_parcela), 0) + 1 INTO _next_num
      FROM public.parcelas_pagamento WHERE pagamento_id = _pag_id;

    INSERT INTO public.parcelas_pagamento (
      pagamento_id, numero_parcela, valor, data_pagamento, status, observacoes
    ) VALUES (
      _pag_id, _next_num, NEW.valor, NEW.vencimento, _new_status,
      NULLIF('Boleto ' || COALESCE(NEW.numero_boleto, '(s/n)'), 'Boleto (s/n)')
    ) RETURNING id INTO _parc_id;

    NEW.parcela_id := _parc_id;
  ELSE
    UPDATE public.parcelas_pagamento
    SET valor = NEW.valor,
        data_pagamento = NEW.vencimento,
        status = _new_status,
        observacoes = COALESCE(NEW.observacoes, observacoes)
    WHERE id = NEW.parcela_id;
    _parc_id := NEW.parcela_id;
  END IF;

  PERFORM public.recalc_pagamento_totais(_pag_id);

  -- If paid, generate commission
  IF _new_status = 'pago' THEN
    PERFORM public.gerar_comissao_parcela(_parc_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_boleto_biu ON public.boletos_amor;
CREATE TRIGGER trg_sync_boleto_biu
BEFORE INSERT OR UPDATE ON public.boletos_amor
FOR EACH ROW EXECUTE FUNCTION public.sync_boleto_to_parcela();

-- 7. On delete boleto -> delete parcela + despesa
CREATE OR REPLACE FUNCTION public.sync_boleto_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pag_id uuid;
BEGIN
  IF OLD.parcela_id IS NOT NULL THEN
    DELETE FROM public.despesas WHERE parcela_origem_id = OLD.parcela_id;
    SELECT pagamento_id INTO _pag_id FROM public.parcelas_pagamento WHERE id = OLD.parcela_id;
    DELETE FROM public.parcelas_pagamento WHERE id = OLD.parcela_id;
    IF _pag_id IS NOT NULL THEN PERFORM public.recalc_pagamento_totais(_pag_id); END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_boleto_ad ON public.boletos_amor;
CREATE TRIGGER trg_sync_boleto_ad
AFTER DELETE ON public.boletos_amor
FOR EACH ROW EXECUTE FUNCTION public.sync_boleto_delete();

-- 8. Backfill (a): every existing boleto without parcela -> create parcela (triggers do the work)
UPDATE public.boletos_amor
SET updated_at = now()
WHERE parcela_id IS NULL;

-- 9. Backfill (b): every existing parcela without boleto -> create central + boleto
DO $$
DECLARE
  _r record;
  _central_id uuid;
BEGIN
  FOR _r IN
    SELECT pp.id AS parcela_id, pp.valor, pp.data_pagamento, pp.status, pp.observacoes,
           pm.mae_id
    FROM public.parcelas_pagamento pp
    JOIN public.pagamentos_mae pm ON pm.id = pp.pagamento_id
    LEFT JOIN public.boletos_amor b ON b.parcela_id = pp.id
    WHERE b.id IS NULL
  LOOP
    SELECT id INTO _central_id FROM public.central_financeira WHERE mae_id = _r.mae_id;
    IF _central_id IS NULL THEN
      INSERT INTO public.central_financeira (mae_id) VALUES (_r.mae_id) RETURNING id INTO _central_id;
    END IF;

    -- Insert boleto directly with parcela_id already set to avoid trigger creating a second parcela
    INSERT INTO public.boletos_amor (central_id, valor, vencimento, status, observacoes, parcela_id)
    VALUES (
      _central_id,
      _r.valor,
      _r.data_pagamento,
      CASE _r.status
        WHEN 'pago' THEN 'pago'
        WHEN 'inadimplente' THEN 'vencido'
        ELSE 'a_emitir'
      END,
      _r.observacoes,
      _r.parcela_id
    );
  END LOOP;
END $$;
