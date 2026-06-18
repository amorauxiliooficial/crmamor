
-- Categoria das observações
DO $$ BEGIN
  CREATE TYPE public.observacao_categoria AS ENUM ('ligacao','whatsapp','documento','reuniao','importado','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de observações
CREATE TABLE IF NOT EXISTS public.mae_observacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mae_id UUID NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome TEXT NOT NULL DEFAULT 'Sistema',
  texto TEXT NOT NULL,
  categoria public.observacao_categoria NOT NULL DEFAULT 'outro',
  fixada BOOLEAN NOT NULL DEFAULT false,
  editada_em TIMESTAMPTZ,
  editada_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  excluida_em TIMESTAMPTZ,
  excluida_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mae_observacoes_mae_id ON public.mae_observacoes(mae_id);
CREATE INDEX IF NOT EXISTS idx_mae_observacoes_created_at ON public.mae_observacoes(created_at DESC);

-- GRANTs (obrigatório para Data API)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mae_observacoes TO authenticated;
GRANT ALL ON public.mae_observacoes TO service_role;

-- RLS
ALTER TABLE public.mae_observacoes ENABLE ROW LEVEL SECURITY;

-- Todos os autenticados podem ler (mantém "todo mundo vê tudo")
CREATE POLICY "Authenticated can view observacoes"
  ON public.mae_observacoes FOR SELECT
  TO authenticated
  USING (true);

-- Qualquer atendente logado pode inserir; precisa ser o autor
CREATE POLICY "Authenticated can insert own observacoes"
  ON public.mae_observacoes FOR INSERT
  TO authenticated
  WITH CHECK (autor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Apenas autor ou admin pode atualizar
CREATE POLICY "Author or admin can update observacoes"
  ON public.mae_observacoes FOR UPDATE
  TO authenticated
  USING (autor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (autor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Apenas autor ou admin pode deletar (caso de hard delete; normalmente usamos soft-delete via UPDATE)
CREATE POLICY "Author or admin can delete observacoes"
  ON public.mae_observacoes FOR DELETE
  TO authenticated
  USING (autor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_mae_observacoes_updated_at ON public.mae_observacoes;
CREATE TRIGGER trg_mae_observacoes_updated_at
  BEFORE UPDATE ON public.mae_observacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.mae_observacoes REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mae_observacoes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill das observações antigas
INSERT INTO public.mae_observacoes (mae_id, autor_id, autor_nome, texto, categoria, created_at, updated_at)
SELECT
  mp.id,
  NULL,
  'Sistema (importado)',
  mp.observacoes,
  'importado'::public.observacao_categoria,
  COALESCE(mp.data_ultima_atualizacao, now()),
  COALESCE(mp.data_ultima_atualizacao, now())
FROM public.mae_processo mp
WHERE mp.observacoes IS NOT NULL
  AND length(btrim(mp.observacoes)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.mae_observacoes o
    WHERE o.mae_id = mp.id AND o.categoria = 'importado'
  );
