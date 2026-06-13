ALTER TABLE public.mae_processo ADD COLUMN IF NOT EXISTS zap_card_id text;

CREATE UNIQUE INDEX IF NOT EXISTS mae_processo_zap_card_id_key 
ON public.mae_processo (zap_card_id) 
WHERE zap_card_id IS NOT NULL;