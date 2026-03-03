-- Add new status to the status_processo enum
ALTER TYPE public.status_processo ADD VALUE IF NOT EXISTS '📄 Rescisão de Contrato';

-- Add follow-up config for the new status
INSERT INTO public.config_prazos_status (status_processo, dias_limite, prazos_progressivos)
VALUES ('📄 Rescisão de Contrato', 3, NULL)
ON CONFLICT DO NOTHING;