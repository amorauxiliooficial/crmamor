-- Enum para status da análise
CREATE TYPE public.status_pre_analise AS ENUM (
  'aprovada',
  'aprovada_com_ressalvas', 
  'nao_aprovavel',
  'erro_processamento'
);

-- Enum para categoria da segurada
CREATE TYPE public.categoria_segurada_analise AS ENUM (
  'empregada_clt',
  'contribuinte_individual',
  'mei',
  'desempregada',
  'segurada_especial',
  'facultativa'
);

-- Enum para motivo de reanálise
CREATE TYPE public.motivo_reanalise AS ENUM (
  'primeiro_registro',
  'documento_novo',
  'correcao_dados',
  'atualizacao_cnis',
  'solicitacao_manual'
);

-- Tabela principal de pré-análises
CREATE TABLE public.pre_analise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mae_id UUID REFERENCES public.mae_processo(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  
  -- Dados de entrada (JSON estruturado)
  dados_entrada JSONB NOT NULL,
  
  -- Resultado da análise
  status_analise status_pre_analise NOT NULL,
  categoria_identificada TEXT,
  carencia_status TEXT,
  periodo_graca_status TEXT,
  situacao_cnis TEXT,
  riscos_identificados JSONB DEFAULT '[]'::jsonb,
  conclusao_detalhada TEXT,
  recomendacoes TEXT[],
  
  -- Metadados
  versao INTEGER NOT NULL DEFAULT 1,
  motivo_reanalise motivo_reanalise NOT NULL DEFAULT 'primeiro_registro',
  observacao_reanalise TEXT,
  
  -- Resposta bruta da IA (para auditoria)
  resposta_ia_raw JSONB,
  modelo_ia_utilizado TEXT,
  tokens_utilizados INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processado_em TIMESTAMP WITH TIME ZONE
);

-- Índices para buscas eficientes
CREATE INDEX idx_pre_analise_mae_id ON public.pre_analise(mae_id);
CREATE INDEX idx_pre_analise_status ON public.pre_analise(status_analise);
CREATE INDEX idx_pre_analise_created_at ON public.pre_analise(created_at DESC);
CREATE INDEX idx_pre_analise_user_id ON public.pre_analise(user_id);

-- Enable RLS
ALTER TABLE public.pre_analise ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view all analyses"
ON public.pre_analise FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create analyses"
ON public.pre_analise FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update analyses"
ON public.pre_analise FOR UPDATE
USING (true);

-- Função para obter próxima versão de análise
CREATE OR REPLACE FUNCTION public.get_next_analise_version(p_mae_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(MAX(versao), 0) + 1
  FROM public.pre_analise
  WHERE mae_id = p_mae_id
$$;