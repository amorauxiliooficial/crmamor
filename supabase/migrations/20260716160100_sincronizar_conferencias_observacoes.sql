-- Vincula cada anotação automática à conferência que a originou.
ALTER TABLE public.mae_observacoes
  ADD COLUMN IF NOT EXISTS conferencia_id UUID
  REFERENCES public.conferencia_inss(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mae_observacoes_conferencia_id
  ON public.mae_observacoes (conferencia_id);

-- Mantém a anotação automática sincronizada com a Conferência INSS.
CREATE OR REPLACE FUNCTION public.sincronizar_conferencia_com_observacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_autor_nome TEXT;
  v_texto TEXT;
BEGIN
  SELECT COALESCE(
    NULLIF(btrim(p.full_name), ''),
    NULLIF(btrim(p.email), ''),
    'Atendente'
  )
  INTO v_autor_nome
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  v_autor_nome := COALESCE(v_autor_nome, 'Atendente');
  v_texto := format(
    'Conferência INSS — %s%s',
    CASE WHEN NEW.houve_atualizacao THEN 'Com atualização' ELSE 'Sem atualização' END,
    CASE
      WHEN NULLIF(btrim(NEW.observacoes), '') IS NULL THEN ''
      ELSE E'\n' || btrim(NEW.observacoes)
    END
  );

  INSERT INTO public.mae_observacoes (
    mae_id,
    autor_id,
    autor_nome,
    texto,
    categoria,
    conferencia_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.mae_id,
    NEW.user_id,
    v_autor_nome,
    v_texto,
    'conferencia'::public.observacao_categoria,
    NEW.id,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (conferencia_id) DO UPDATE
  SET mae_id = EXCLUDED.mae_id,
      autor_id = EXCLUDED.autor_id,
      autor_nome = EXCLUDED.autor_nome,
      texto = EXCLUDED.texto,
      categoria = EXCLUDED.categoria,
      excluida_em = NULL,
      excluida_por = NULL,
      updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sincronizar_conferencia_observacao
  ON public.conferencia_inss;
CREATE TRIGGER trg_sincronizar_conferencia_observacao
AFTER INSERT OR UPDATE OF mae_id, user_id, houve_atualizacao, observacoes
ON public.conferencia_inss
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_conferencia_com_observacao();

-- Recalcula sempre a data válida mais recente, inclusive após exclusões.
CREATE OR REPLACE FUNCTION public.atualizar_ultimo_contato_mae()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mae_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_mae_id := OLD.mae_id;
  ELSE
    v_mae_id := NEW.mae_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.mae_id IS DISTINCT FROM NEW.mae_id THEN
    UPDATE public.mae_processo mp
    SET ultimo_contato_em = (
      SELECT max(o.created_at)
      FROM public.mae_observacoes o
      WHERE o.mae_id = OLD.mae_id
        AND o.excluida_em IS NULL
    )
    WHERE mp.id = OLD.mae_id;
  END IF;

  UPDATE public.mae_processo mp
  SET ultimo_contato_em = (
    SELECT max(o.created_at)
    FROM public.mae_observacoes o
    WHERE o.mae_id = v_mae_id
      AND o.excluida_em IS NULL
  )
  WHERE mp.id = v_mae_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_ultimo_contato_mae
  ON public.mae_observacoes;
DROP TRIGGER IF EXISTS trg_atualizar_ultimo_contato_mae_insert
  ON public.mae_observacoes;
DROP TRIGGER IF EXISTS trg_atualizar_ultimo_contato_mae_update
  ON public.mae_observacoes;
DROP TRIGGER IF EXISTS trg_atualizar_ultimo_contato_mae_delete
  ON public.mae_observacoes;

CREATE TRIGGER trg_atualizar_ultimo_contato_mae_insert
AFTER INSERT ON public.mae_observacoes
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_ultimo_contato_mae();

CREATE TRIGGER trg_atualizar_ultimo_contato_mae_update
AFTER UPDATE OF mae_id, created_at, excluida_em ON public.mae_observacoes
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_ultimo_contato_mae();

CREATE TRIGGER trg_atualizar_ultimo_contato_mae_delete
AFTER DELETE ON public.mae_observacoes
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_ultimo_contato_mae();

-- Importa todo o histórico de conferências existente sem duplicar entradas.
INSERT INTO public.mae_observacoes (
  mae_id,
  autor_id,
  autor_nome,
  texto,
  categoria,
  conferencia_id,
  created_at,
  updated_at
)
SELECT
  c.mae_id,
  c.user_id,
  COALESCE(
    NULLIF(btrim(p.full_name), ''),
    NULLIF(btrim(p.email), ''),
    'Atendente'
  ),
  format(
    'Conferência INSS — %s%s',
    CASE WHEN c.houve_atualizacao THEN 'Com atualização' ELSE 'Sem atualização' END,
    CASE
      WHEN NULLIF(btrim(c.observacoes), '') IS NULL THEN ''
      ELSE E'\n' || btrim(c.observacoes)
    END
  ),
  'conferencia'::public.observacao_categoria,
  c.id,
  c.created_at,
  c.created_at
FROM public.conferencia_inss c
LEFT JOIN public.profiles p ON p.id = c.user_id
ON CONFLICT (conferencia_id) DO NOTHING;
