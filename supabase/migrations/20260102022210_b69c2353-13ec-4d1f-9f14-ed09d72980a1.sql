-- Change resposta from text to text[] for multiple answers
ALTER TABLE public.playbook_entradas 
  ADD COLUMN respostas text[] DEFAULT '{}';

-- Migrate existing data
UPDATE public.playbook_entradas 
SET respostas = ARRAY[resposta] 
WHERE resposta IS NOT NULL AND resposta != '';

-- Drop old column
ALTER TABLE public.playbook_entradas 
  DROP COLUMN resposta;