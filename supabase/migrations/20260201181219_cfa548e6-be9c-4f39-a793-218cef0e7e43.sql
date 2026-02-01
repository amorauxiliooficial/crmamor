-- Enum para categorias de despesas
CREATE TYPE public.categoria_despesa AS ENUM (
  'fornecedor_servico',
  'custo_operacional', 
  'comissao_parceiro',
  'impostos',
  'outros'
);

-- Enum para status de transação
CREATE TYPE public.status_transacao AS ENUM (
  'pendente',
  'pago',
  'cancelado',
  'atrasado'
);

-- Enum para tipo de recorrência
CREATE TYPE public.tipo_recorrencia AS ENUM (
  'unica',
  'mensal',
  'trimestral',
  'anual'
);

-- Tabela principal de despesas/saídas
CREATE TABLE public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  categoria categoria_despesa NOT NULL DEFAULT 'outros',
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status status_transacao NOT NULL DEFAULT 'pendente',
  recorrencia tipo_recorrencia NOT NULL DEFAULT 'unica',
  fornecedor TEXT,
  observacoes TEXT,
  comprovante_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_despesas_user_id ON public.despesas(user_id);
CREATE INDEX idx_despesas_data_vencimento ON public.despesas(data_vencimento);
CREATE INDEX idx_despesas_status ON public.despesas(status);
CREATE INDEX idx_despesas_categoria ON public.despesas(categoria);

-- Enable RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view all expenses"
ON public.despesas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create expenses"
ON public.despesas FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all expenses"
ON public.despesas FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all expenses"
ON public.despesas FOR DELETE
TO authenticated
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_despesas_updated_at
BEFORE UPDATE ON public.despesas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.despesas;