
-- 1) Nova coluna em parcelas_pagamento
ALTER TABLE public.parcelas_pagamento
  ADD COLUMN IF NOT EXISTS pago_em date;

-- Backfill: para parcelas já pagas usa updated_at (data da baixa)
UPDATE public.parcelas_pagamento
   SET pago_em = updated_at::date
 WHERE status = 'pago' AND pago_em IS NULL;

-- Trigger para manter pago_em em sincronia
CREATE OR REPLACE FUNCTION public.set_parcela_pago_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pago' AND NEW.pago_em IS NULL THEN
      NEW.pago_em := current_date;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') AND NEW.pago_em IS NULL THEN
      NEW.pago_em := current_date;
    ELSIF NEW.status <> 'pago' AND OLD.status = 'pago' THEN
      NEW.pago_em := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parcela_pago_em ON public.parcelas_pagamento;
CREATE TRIGGER trg_parcela_pago_em
BEFORE INSERT OR UPDATE ON public.parcelas_pagamento
FOR EACH ROW EXECUTE FUNCTION public.set_parcela_pago_em();

-- 2) Mesmo tratamento para boletos_amor
ALTER TABLE public.boletos_amor
  ADD COLUMN IF NOT EXISTS pago_em date;

UPDATE public.boletos_amor
   SET pago_em = updated_at::date
 WHERE status = 'pago' AND pago_em IS NULL;

CREATE OR REPLACE FUNCTION public.set_boleto_pago_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pago' AND NEW.pago_em IS NULL THEN
      NEW.pago_em := current_date;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') AND NEW.pago_em IS NULL THEN
      NEW.pago_em := current_date;
    ELSIF NEW.status <> 'pago' AND OLD.status = 'pago' THEN
      NEW.pago_em := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_boleto_pago_em ON public.boletos_amor;
CREATE TRIGGER trg_boleto_pago_em
BEFORE INSERT OR UPDATE ON public.boletos_amor
FOR EACH ROW EXECUTE FUNCTION public.set_boleto_pago_em();
