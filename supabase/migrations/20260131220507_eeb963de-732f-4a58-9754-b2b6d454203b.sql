-- 1. Primeiro, atualizar os registros existentes na mae_processo para os status que serão mantidos
-- Migrar "Entrada de Documentos" para "Pendência Documental"
UPDATE public.mae_processo 
SET status_processo = 'Pendência Documental'::status_processo
WHERE status_processo = 'Entrada de Documentos'::status_processo;

-- Migrar "Em Análise" para "Elegível (Análise Positiva)"
UPDATE public.mae_processo 
SET status_processo = 'Elegível (Análise Positiva)'::status_processo
WHERE status_processo = 'Em Análise'::status_processo;

-- Migrar "Protocolo INSS" para "Aguardando Análise INSS"
UPDATE public.mae_processo 
SET status_processo = 'Aguardando Análise INSS'::status_processo
WHERE status_processo = 'Protocolo INSS'::status_processo;

-- 2. Adicionar novo valor "Inadimplência" ao enum
ALTER TYPE status_processo ADD VALUE IF NOT EXISTS 'Inadimplência';

-- 3. Atualizar os prazos na tabela config_prazos_status
-- Elegível (Análise Positiva) - 7 dias (1 semana)
UPDATE public.config_prazos_status SET dias_limite = 7 WHERE status_processo = 'Elegível (Análise Positiva)';

-- Pendência Documental - 7 dias (1 semana)
UPDATE public.config_prazos_status SET dias_limite = 7 WHERE status_processo = 'Pendência Documental';

-- Aguardando Análise INSS - 15 dias
UPDATE public.config_prazos_status SET dias_limite = 15 WHERE status_processo = 'Aguardando Análise INSS';

-- Aprovada - 1 dia
UPDATE public.config_prazos_status SET dias_limite = 1 WHERE status_processo = 'Aprovada';

-- Indeferida - 3 dias (primeiro prazo do escalonamento)
UPDATE public.config_prazos_status SET dias_limite = 3 WHERE status_processo = 'Indeferida';

-- Recurso / Judicial - 15 dias
UPDATE public.config_prazos_status SET dias_limite = 15 WHERE status_processo = 'Recurso / Judicial';

-- Processo Encerrado - 0 (sem follow-up)
UPDATE public.config_prazos_status SET dias_limite = 0 WHERE status_processo = 'Processo Encerrado';

-- Remover configs dos status que não existem mais
DELETE FROM public.config_prazos_status WHERE status_processo IN ('Entrada de Documentos', 'Em Análise', 'Protocolo INSS');

-- 4. Adicionar config para Inadimplência
INSERT INTO public.config_prazos_status (status_processo, dias_limite)
VALUES ('Inadimplência', 1)
ON CONFLICT DO NOTHING;

-- 5. Adicionar coluna para armazenar prazos progressivos (para Indeferida/Recurso)
ALTER TABLE public.config_prazos_status 
ADD COLUMN IF NOT EXISTS prazos_progressivos integer[] DEFAULT NULL;

-- 6. Definir prazos progressivos para Indeferida e Recurso / Judicial
UPDATE public.config_prazos_status 
SET prazos_progressivos = ARRAY[3, 15, 60, 90] 
WHERE status_processo IN ('Indeferida', 'Recurso / Judicial');