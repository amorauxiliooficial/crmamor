-- Toda anotação adicionada ao histórico conta como contato com a mãe.
ALTER TABLE public.mae_processo
  ADD COLUMN IF NOT EXISTS ultimo_contato_em timestamptz;

-- Preserva o histórico já existente.
UPDATE public.mae_processo mp
SET ultimo_contato_em = obs.ultimo_contato
FROM (
  SELECT mae_id, max(created_at) AS ultimo_contato
  FROM public.mae_observacoes
  WHERE excluida_em IS NULL
  GROUP BY mae_id
) obs
WHERE mp.id = obs.mae_id
  AND mp.ultimo_contato_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_mae_processo_ultimo_contato
  ON public.mae_processo (ultimo_contato_em);

CREATE OR REPLACE FUNCTION public.atualizar_ultimo_contato_mae()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mae_processo
  SET ultimo_contato_em = NEW.created_at
  WHERE id = NEW.mae_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_ultimo_contato_mae ON public.mae_observacoes;
CREATE TRIGGER trg_atualizar_ultimo_contato_mae
AFTER INSERT ON public.mae_observacoes
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_ultimo_contato_mae();
