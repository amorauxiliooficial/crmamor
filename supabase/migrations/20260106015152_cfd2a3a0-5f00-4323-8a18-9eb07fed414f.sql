-- Adicionar coluna para mês de gestação manual
ALTER TABLE public.mae_processo 
ADD COLUMN mes_gestacao integer DEFAULT NULL;

-- Adicionar constraint para validar valores entre 1 e 9
ALTER TABLE public.mae_processo 
ADD CONSTRAINT mes_gestacao_valido CHECK (mes_gestacao IS NULL OR (mes_gestacao >= 1 AND mes_gestacao <= 9));