-- Add CRM fields to atividades_mae table
ALTER TABLE public.atividades_mae
ADD COLUMN IF NOT EXISTS resultado_contato text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proxima_acao text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS data_proxima_acao timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status_followup text DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS concluido boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS concluido_em timestamp with time zone DEFAULT NULL;

-- Create index for better query performance on pending follow-ups
CREATE INDEX IF NOT EXISTS idx_atividades_mae_proxima_acao ON public.atividades_mae(data_proxima_acao) WHERE data_proxima_acao IS NOT NULL AND concluido = false;

-- Create index for status filter
CREATE INDEX IF NOT EXISTS idx_atividades_mae_status_followup ON public.atividades_mae(status_followup);

-- Add comment for documentation
COMMENT ON COLUMN public.atividades_mae.resultado_contato IS 'Resultado do contato: conseguiu_falar, nao_atendeu, ocupado, deixou_recado, avancou, aguardando, pendencia';
COMMENT ON COLUMN public.atividades_mae.proxima_acao IS 'Tipo da próxima ação: ligacao, whatsapp, documento, reuniao, aguardar_retorno';
COMMENT ON COLUMN public.atividades_mae.data_proxima_acao IS 'Data e hora agendada para o próximo follow-up';
COMMENT ON COLUMN public.atividades_mae.status_followup IS 'Status: pendente, agendado, concluido, cancelado';
COMMENT ON COLUMN public.atividades_mae.concluido IS 'Se o follow-up foi concluído';
COMMENT ON COLUMN public.atividades_mae.concluido_em IS 'Data/hora que o follow-up foi marcado como concluído';