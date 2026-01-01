-- Adicionar campo para agendar próxima ação
ALTER TABLE public.indicacoes 
ADD COLUMN proxima_acao_data TIMESTAMP WITH TIME ZONE,
ADD COLUMN proxima_acao_observacao TEXT;

-- Adicionar observação na tabela de ações
ALTER TABLE public.acoes_indicacao
ADD COLUMN observacao TEXT;