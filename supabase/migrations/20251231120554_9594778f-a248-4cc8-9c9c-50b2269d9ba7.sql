-- Enum types for the process
CREATE TYPE public.status_processo AS ENUM (
  'Entrada de Documentos',
  'Em Análise',
  'Pendência Documental',
  'Elegível (Análise Positiva)',
  'Protocolo INSS',
  'Aguardando Análise INSS',
  'Aprovada',
  'Indeferida',
  'Recurso / Judicial',
  'Processo Encerrado'
);

CREATE TYPE public.tipo_evento AS ENUM ('Parto', 'Adoção', 'Guarda judicial');

CREATE TYPE public.data_evento_tipo AS ENUM ('Parto (real)', 'DPP', '');

CREATE TYPE public.categoria_previdenciaria AS ENUM (
  'CLT',
  'MEI',
  'Contribuinte Individual',
  'Desempregada',
  'Não informado'
);

CREATE TYPE public.checklist_status AS ENUM ('OK', 'Incompleto');

CREATE TYPE public.resultado_final AS ENUM ('APROVADA', 'REPROVADA');

-- Main table for mother processes
CREATE TABLE public.mae_processo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_mae TEXT NOT NULL,
  cpf TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  tipo_evento public.tipo_evento NOT NULL DEFAULT 'Parto',
  data_evento DATE,
  data_evento_tipo public.data_evento_tipo DEFAULT '',
  categoria_previdenciaria public.categoria_previdenciaria NOT NULL DEFAULT 'Não informado',
  status_processo public.status_processo NOT NULL DEFAULT 'Entrada de Documentos',
  protocolo_inss TEXT,
  parcelas TEXT,
  contrato_assinado BOOLEAN NOT NULL DEFAULT false,
  segurada TEXT,
  precisa_gps TEXT,
  uf TEXT,
  observacoes TEXT,
  origem TEXT,
  data_ultima_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Checklist table
CREATE TABLE public.checklist_mae (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mae_id UUID REFERENCES public.mae_processo(id) ON DELETE CASCADE NOT NULL UNIQUE,
  qualidade_segurada BOOLEAN NOT NULL DEFAULT false,
  carencia_cumprida BOOLEAN NOT NULL DEFAULT false,
  prazo_legal_ok BOOLEAN NOT NULL DEFAULT false,
  documentos_completos BOOLEAN NOT NULL DEFAULT false,
  checklist_status public.checklist_status NOT NULL DEFAULT 'Incompleto',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Decision table
CREATE TABLE public.decisao_processo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mae_id UUID REFERENCES public.mae_processo(id) ON DELETE CASCADE NOT NULL UNIQUE,
  resultado_final public.resultado_final,
  motivo_decisao TEXT,
  observacoes_internas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mae_processo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_mae ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisao_processo ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mae_processo
CREATE POLICY "Users can view their own processes" 
ON public.mae_processo 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own processes" 
ON public.mae_processo 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processes" 
ON public.mae_processo 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processes" 
ON public.mae_processo 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for checklist_mae (through mae_processo ownership)
CREATE POLICY "Users can view checklists of their processes" 
ON public.checklist_mae 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.mae_processo 
  WHERE mae_processo.id = checklist_mae.mae_id 
  AND mae_processo.user_id = auth.uid()
));

CREATE POLICY "Users can create checklists for their processes" 
ON public.checklist_mae 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.mae_processo 
  WHERE mae_processo.id = checklist_mae.mae_id 
  AND mae_processo.user_id = auth.uid()
));

CREATE POLICY "Users can update checklists of their processes" 
ON public.checklist_mae 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.mae_processo 
  WHERE mae_processo.id = checklist_mae.mae_id 
  AND mae_processo.user_id = auth.uid()
));

CREATE POLICY "Users can delete checklists of their processes" 
ON public.checklist_mae 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.mae_processo 
  WHERE mae_processo.id = checklist_mae.mae_id 
  AND mae_processo.user_id = auth.uid()
));

-- RLS Policies for decisao_processo (through mae_processo ownership)
CREATE POLICY "Users can view decisions of their processes" 
ON public.decisao_processo 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.mae_processo 
  WHERE mae_processo.id = decisao_processo.mae_id 
  AND mae_processo.user_id = auth.uid()
));

CREATE POLICY "Users can create decisions for their processes" 
ON public.decisao_processo 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.mae_processo 
  WHERE mae_processo.id = decisao_processo.mae_id 
  AND mae_processo.user_id = auth.uid()
));

CREATE POLICY "Users can update decisions of their processes" 
ON public.decisao_processo 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.mae_processo 
  WHERE mae_processo.id = decisao_processo.mae_id 
  AND mae_processo.user_id = auth.uid()
));

CREATE POLICY "Users can delete decisions of their processes" 
ON public.decisao_processo 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.mae_processo 
  WHERE mae_processo.id = decisao_processo.mae_id 
  AND mae_processo.user_id = auth.uid()
));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to update data_ultima_atualizacao on mae_processo
CREATE OR REPLACE FUNCTION public.update_data_ultima_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_ultima_atualizacao = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_checklist_mae_updated_at
BEFORE UPDATE ON public.checklist_mae
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_decisao_processo_updated_at
BEFORE UPDATE ON public.decisao_processo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mae_processo_data_atualizacao
BEFORE UPDATE ON public.mae_processo
FOR EACH ROW
EXECUTE FUNCTION public.update_data_ultima_atualizacao();

-- Create indexes for better performance
CREATE INDEX idx_mae_processo_user_id ON public.mae_processo(user_id);
CREATE INDEX idx_mae_processo_status ON public.mae_processo(status_processo);
CREATE INDEX idx_mae_processo_cpf ON public.mae_processo(cpf);
CREATE INDEX idx_checklist_mae_mae_id ON public.checklist_mae(mae_id);
CREATE INDEX idx_decisao_processo_mae_id ON public.decisao_processo(mae_id);