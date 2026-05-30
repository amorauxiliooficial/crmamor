-- Adiciona novos valores ao enum status_processo
ALTER TYPE public.status_processo ADD VALUE IF NOT EXISTS 'Gestantes 1 a 7 meses' BEFORE 'Gestantes em Maturação';
ALTER TYPE public.status_processo ADD VALUE IF NOT EXISTS 'Entradas do Mês' BEFORE 'Pendência Documental';

-- Adiciona coluna para rastrear o status anterior (preserva histórico de migração)
ALTER TABLE public.mae_processo
  ADD COLUMN IF NOT EXISTS status_anterior TEXT;