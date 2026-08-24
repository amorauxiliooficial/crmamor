ALTER TYPE public.status_processo ADD VALUE IF NOT EXISTS 'Pré-Análise de Elegibilidade';

INSERT INTO public.config_prazos_status (status_processo, dias_limite, prazos_progressivos)
SELECT 'Pré-Análise de Elegibilidade', 5, ARRAY[3,5]
WHERE NOT EXISTS (
  SELECT 1 FROM public.config_prazos_status WHERE status_processo = 'Pré-Análise de Elegibilidade'
);