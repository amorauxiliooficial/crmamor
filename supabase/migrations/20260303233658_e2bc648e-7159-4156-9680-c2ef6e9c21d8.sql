-- Add valor_a_receber column to pagamentos_mae (conference-only, not used in KPIs)
ALTER TABLE public.pagamentos_mae 
ADD COLUMN IF NOT EXISTS valor_a_receber numeric DEFAULT NULL;