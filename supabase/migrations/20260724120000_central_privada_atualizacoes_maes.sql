-- Lista privada de pessoas autorizadas a consultar a Central de Atualizações.
CREATE TABLE IF NOT EXISTS public.atualizacoes_maes_acesso (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.atualizacoes_maes_acesso ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atualizacoes_maes_acesso FROM anon, authenticated;
GRANT SELECT ON public.atualizacoes_maes_acesso TO authenticated;
GRANT ALL ON public.atualizacoes_maes_acesso TO service_role;

DROP POLICY IF EXISTS "Users can read their private updates access"
  ON public.atualizacoes_maes_acesso;
CREATE POLICY "Users can read their private updates access"
  ON public.atualizacoes_maes_acesso
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.can_view_atualizacoes_maes()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.atualizacoes_maes_acesso acesso
    WHERE acesso.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_atualizacoes_maes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_atualizacoes_maes() TO authenticated;

-- Feed consolidado. Não armazena CPF, senha, telefone ou conteúdo de documentos.
CREATE TABLE IF NOT EXISTS public.mae_atualizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mae_id UUID NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'contato',
    'resumo_ia',
    'documento',
    'status',
    'cadastro'
  )),
  titulo TEXT NOT NULL,
  descricao TEXT,
  origem TEXT,
  source_key TEXT UNIQUE,
  alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mae_atualizacoes_created_at
  ON public.mae_atualizacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mae_atualizacoes_mae
  ON public.mae_atualizacoes(mae_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mae_atualizacoes_tipo
  ON public.mae_atualizacoes(tipo, created_at DESC);

ALTER TABLE public.mae_atualizacoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mae_atualizacoes FROM anon, authenticated;
GRANT SELECT ON public.mae_atualizacoes TO authenticated;
GRANT ALL ON public.mae_atualizacoes TO service_role;

DROP POLICY IF EXISTS "Private users can read mother updates"
  ON public.mae_atualizacoes;
CREATE POLICY "Private users can read mother updates"
  ON public.mae_atualizacoes
  FOR SELECT TO authenticated
  USING (public.can_view_atualizacoes_maes());

CREATE OR REPLACE FUNCTION public.registrar_atualizacao_observacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo TEXT;
  v_titulo TEXT;
BEGIN
  IF NEW.excluida_em IS NOT NULL THEN
    DELETE FROM public.mae_atualizacoes
    WHERE source_key = 'observacao:' || NEW.id::text;
    RETURN NEW;
  END IF;

  IF NEW.autor_id IS NULL AND NEW.autor_nome LIKE 'ZapResponder%Resumo IA%' THEN
    v_tipo := 'resumo_ia';
    v_titulo := 'Resumo da conversa gerado';
  ELSE
    v_tipo := 'contato';
    v_titulo := 'Contato registrado';
  END IF;

  INSERT INTO public.mae_atualizacoes (
    mae_id,
    tipo,
    titulo,
    descricao,
    origem,
    source_key,
    alterado_por,
    created_at
  )
  VALUES (
    NEW.mae_id,
    v_tipo,
    v_titulo,
    left(NEW.texto, 1200),
    NEW.categoria::text,
    'observacao:' || NEW.id::text,
    NEW.autor_id,
    NEW.created_at
  )
  ON CONFLICT (source_key) DO UPDATE
  SET mae_id = EXCLUDED.mae_id,
      tipo = EXCLUDED.tipo,
      titulo = EXCLUDED.titulo,
      descricao = EXCLUDED.descricao,
      origem = EXCLUDED.origem,
      alterado_por = EXCLUDED.alterado_por,
      created_at = EXCLUDED.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_atualizacao_observacao
  ON public.mae_observacoes;
CREATE TRIGGER trg_registrar_atualizacao_observacao
AFTER INSERT OR UPDATE OF mae_id, texto, categoria, autor_id, autor_nome, created_at, excluida_em
ON public.mae_observacoes
FOR EACH ROW
EXECUTE FUNCTION public.registrar_atualizacao_observacao();

CREATE OR REPLACE FUNCTION public.registrar_atualizacao_documento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.mae_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.mae_atualizacoes (
    mae_id,
    tipo,
    titulo,
    descricao,
    origem,
    source_key,
    created_at
  )
  VALUES (
    NEW.mae_id,
    'documento',
    'Documento recebido',
    left(NEW.nome_arquivo, 300),
    NEW.source,
    'documento:' || NEW.id::text,
    COALESCE(NEW.received_at, NEW.created_at)
  )
  ON CONFLICT (source_key) DO UPDATE
  SET mae_id = EXCLUDED.mae_id,
      descricao = EXCLUDED.descricao,
      origem = EXCLUDED.origem,
      created_at = EXCLUDED.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_atualizacao_documento
  ON public.mae_documentos;
CREATE TRIGGER trg_registrar_atualizacao_documento
AFTER INSERT OR UPDATE OF mae_id, nome_arquivo, source, received_at
ON public.mae_documentos
FOR EACH ROW
EXECUTE FUNCTION public.registrar_atualizacao_documento();

CREATE OR REPLACE FUNCTION public.registrar_atualizacao_cadastro_mae()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status_processo IS DISTINCT FROM NEW.status_processo THEN
    INSERT INTO public.mae_atualizacoes (
      mae_id, tipo, titulo, descricao, origem, alterado_por
    )
    VALUES (
      NEW.id,
      'status',
      'Etapa atualizada',
      OLD.status_processo::text || ' → ' || NEW.status_processo::text,
      'cadastro',
      auth.uid()
    );
  END IF;

  IF OLD.telefone IS DISTINCT FROM NEW.telefone THEN
    INSERT INTO public.mae_atualizacoes (
      mae_id, tipo, titulo, origem, alterado_por
    )
    VALUES (
      NEW.id, 'cadastro', 'Telefone atualizado', 'cadastro', auth.uid()
    );
  END IF;

  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO public.mae_atualizacoes (
      mae_id, tipo, titulo, origem, alterado_por
    )
    VALUES (
      NEW.id, 'cadastro', 'E-mail atualizado', 'cadastro', auth.uid()
    );
  END IF;

  IF OLD.contrato_assinado IS DISTINCT FROM NEW.contrato_assinado THEN
    INSERT INTO public.mae_atualizacoes (
      mae_id, tipo, titulo, descricao, origem, alterado_por
    )
    VALUES (
      NEW.id,
      'cadastro',
      'Contrato atualizado',
      CASE WHEN NEW.contrato_assinado THEN 'Contrato assinado' ELSE 'Contrato desmarcado' END,
      'cadastro',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_atualizacao_cadastro_mae
  ON public.mae_processo;
CREATE TRIGGER trg_registrar_atualizacao_cadastro_mae
AFTER UPDATE OF status_processo, telefone, email, contrato_assinado
ON public.mae_processo
FOR EACH ROW
EXECUTE FUNCTION public.registrar_atualizacao_cadastro_mae();

-- Dá utilidade imediata à central com os contatos e documentos dos últimos 30 dias.
INSERT INTO public.mae_atualizacoes (
  mae_id,
  tipo,
  titulo,
  descricao,
  origem,
  source_key,
  alterado_por,
  created_at
)
SELECT
  observacao.mae_id,
  CASE
    WHEN observacao.autor_id IS NULL
      AND observacao.autor_nome LIKE 'ZapResponder%Resumo IA%'
    THEN 'resumo_ia'
    ELSE 'contato'
  END,
  CASE
    WHEN observacao.autor_id IS NULL
      AND observacao.autor_nome LIKE 'ZapResponder%Resumo IA%'
    THEN 'Resumo da conversa gerado'
    ELSE 'Contato registrado'
  END,
  left(observacao.texto, 1200),
  observacao.categoria::text,
  'observacao:' || observacao.id::text,
  observacao.autor_id,
  observacao.created_at
FROM public.mae_observacoes observacao
WHERE observacao.excluida_em IS NULL
  AND observacao.created_at >= now() - interval '30 days'
ON CONFLICT (source_key) DO NOTHING;

INSERT INTO public.mae_atualizacoes (
  mae_id,
  tipo,
  titulo,
  descricao,
  origem,
  source_key,
  created_at
)
SELECT
  documento.mae_id,
  'documento',
  'Documento recebido',
  left(documento.nome_arquivo, 300),
  documento.source,
  'documento:' || documento.id::text,
  COALESCE(documento.received_at, documento.created_at)
FROM public.mae_documentos documento
WHERE documento.mae_id IS NOT NULL
  AND COALESCE(documento.received_at, documento.created_at) >= now() - interval '30 days'
ON CONFLICT (source_key) DO NOTHING;
