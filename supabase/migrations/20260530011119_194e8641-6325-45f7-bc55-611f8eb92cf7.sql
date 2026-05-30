-- 1) Registra no histórico a migração de etapa para cada processo afetado
INSERT INTO public.mae_status_history (mae_id, status_anterior, status_novo, changed_at)
SELECT id, status_processo::text, 'Entradas do Mês', now()
FROM public.mae_processo
WHERE status_processo::text IN ('Pendência Documental', 'Elegível (Análise Positiva)');

INSERT INTO public.mae_status_history (mae_id, status_anterior, status_novo, changed_at)
SELECT id, status_processo::text, 'Gestantes 1 a 7 meses', now()
FROM public.mae_processo
WHERE status_processo::text = 'Gestantes em Maturação';

-- 2) Preserva o status original em status_anterior (apenas se ainda vazio)
UPDATE public.mae_processo
SET status_anterior = status_processo::text
WHERE status_anterior IS NULL
  AND status_processo::text IN (
    'Pendência Documental',
    'Elegível (Análise Positiva)',
    'Gestantes em Maturação'
  );

-- 3) Migra os status atuais para as novas etapas
UPDATE public.mae_processo
SET status_processo = 'Entradas do Mês'::status_processo
WHERE status_processo::text IN ('Pendência Documental', 'Elegível (Análise Positiva)');

UPDATE public.mae_processo
SET status_processo = 'Gestantes 1 a 7 meses'::status_processo
WHERE status_processo::text = 'Gestantes em Maturação';