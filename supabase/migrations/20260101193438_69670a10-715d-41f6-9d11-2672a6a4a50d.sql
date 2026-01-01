-- Add proxima_acao column to indicacoes table
ALTER TABLE public.indicacoes 
ADD COLUMN IF NOT EXISTS proxima_acao text;