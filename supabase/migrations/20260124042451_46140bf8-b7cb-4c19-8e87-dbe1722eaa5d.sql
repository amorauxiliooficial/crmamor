-- Add simplified result columns for attendant view
ALTER TABLE public.pre_analise 
ADD COLUMN IF NOT EXISTS resultado_atendente TEXT,
ADD COLUMN IF NOT EXISTS motivo_curto TEXT,
ADD COLUMN IF NOT EXISTS proxima_acao TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.pre_analise.resultado_atendente IS 'Simplified result for attendants: APROVADO, REPROVADO, JURIDICO';
COMMENT ON COLUMN public.pre_analise.motivo_curto IS 'Short reason text for non-approved cases';
COMMENT ON COLUMN public.pre_analise.proxima_acao IS 'Next action: PROTOCOLO_INSS, ENCAMINHAR_JURIDICO, SOLICITAR_DOCS';