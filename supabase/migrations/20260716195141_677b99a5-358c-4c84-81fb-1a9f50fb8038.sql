
ALTER TABLE public.mae_processo
  ADD COLUMN IF NOT EXISTS ultimo_contato_em TIMESTAMPTZ;

-- Backfill com a observação mais recente já registrada
UPDATE public.mae_processo m
SET ultimo_contato_em = sub.max_created
FROM (
  SELECT mae_id, MAX(created_at) AS max_created
  FROM public.mae_observacoes
  WHERE excluida_em IS NULL
  GROUP BY mae_id
) sub
WHERE m.id = sub.mae_id;

-- Trigger: sempre que uma anotação é adicionada, atualiza ultimo_contato_em
CREATE OR REPLACE FUNCTION public.update_mae_ultimo_contato()
RETURNS TRIGGER
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

DROP TRIGGER IF EXISTS trg_mae_observacoes_ultimo_contato ON public.mae_observacoes;
CREATE TRIGGER trg_mae_observacoes_ultimo_contato
AFTER INSERT ON public.mae_observacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_mae_ultimo_contato();
