-- Add column for OneDrive documents link
ALTER TABLE public.mae_processo 
ADD COLUMN IF NOT EXISTS link_documentos TEXT;