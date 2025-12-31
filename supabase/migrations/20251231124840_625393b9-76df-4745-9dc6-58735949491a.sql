-- Add new columns to mae_processo table
ALTER TABLE public.mae_processo 
ADD COLUMN IF NOT EXISTS senha_gov text,
ADD COLUMN IF NOT EXISTS verificacao_duas_etapas boolean NOT NULL DEFAULT false;