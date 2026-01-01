-- Add is_gestante column to mae_processo table
ALTER TABLE public.mae_processo 
ADD COLUMN is_gestante boolean NOT NULL DEFAULT false;