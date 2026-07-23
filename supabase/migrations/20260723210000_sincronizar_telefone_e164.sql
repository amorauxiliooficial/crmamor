-- Mantém o telefone técnico usado pelas integrações sincronizado com o
-- telefone principal exibido no cadastro da mãe.
CREATE OR REPLACE FUNCTION public.sync_mae_processo_telefone_e164()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  digits text;
  ddd integer;
BEGIN
  digits := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');

  IF length(digits) IN (12, 13) AND left(digits, 2) = '55' THEN
    digits := substring(digits FROM 3);
  END IF;

  IF length(digits) NOT IN (10, 11) THEN
    NEW.telefone_e164 := NULL;
    RETURN NEW;
  END IF;

  ddd := left(digits, 2)::integer;
  IF ddd < 11 OR ddd > 99 THEN
    NEW.telefone_e164 := NULL;
    RETURN NEW;
  END IF;

  NEW.telefone_e164 := '+55' || digits;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_mae_processo_telefone_e164
  ON public.mae_processo;

CREATE TRIGGER trg_sync_mae_processo_telefone_e164
BEFORE INSERT OR UPDATE OF telefone
ON public.mae_processo
FOR EACH ROW
EXECUTE FUNCTION public.sync_mae_processo_telefone_e164();

-- Corrige cadastros existentes sem expor ou alterar o telefone informado.
WITH normalized AS (
  SELECT
    id,
    CASE
      WHEN length(local_digits) IN (10, 11)
        AND left(local_digits, 2)::integer BETWEEN 11 AND 99
      THEN '+55' || local_digits
      ELSE NULL
    END AS telefone_e164
  FROM (
    SELECT
      id,
      CASE
        WHEN length(raw_digits) IN (12, 13) AND left(raw_digits, 2) = '55'
        THEN substring(raw_digits FROM 3)
        ELSE raw_digits
      END AS local_digits
    FROM (
      SELECT
        id,
        regexp_replace(COALESCE(telefone, ''), '\D', '', 'g') AS raw_digits
      FROM public.mae_processo
    ) raw
  ) local_phone
)
UPDATE public.mae_processo AS mae
SET telefone_e164 = normalized.telefone_e164
FROM normalized
WHERE mae.id = normalized.id
  AND mae.telefone_e164 IS DISTINCT FROM normalized.telefone_e164;
