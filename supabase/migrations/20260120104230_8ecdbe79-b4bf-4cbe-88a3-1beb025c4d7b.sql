-- Adicionar coluna para identificar origem da indicação
ALTER TABLE public.indicacoes 
ADD COLUMN IF NOT EXISTS origem_indicacao text DEFAULT 'interna';

-- Criar index para filtrar por origem
CREATE INDEX IF NOT EXISTS idx_indicacoes_origem ON public.indicacoes(origem_indicacao);

-- Criar política RLS para permitir inserção via service role (edge function)
-- A tabela já tem RLS habilitado, então a edge function usará service role