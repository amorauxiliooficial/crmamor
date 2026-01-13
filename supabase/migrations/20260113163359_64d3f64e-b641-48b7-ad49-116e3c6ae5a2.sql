-- Add CEP field to mae_processo
ALTER TABLE public.mae_processo ADD COLUMN IF NOT EXISTS cep text;

-- Create banks table for pre-registered banks
CREATE TABLE public.bancos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  endereco text NOT NULL,
  cidade text,
  uf text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;

-- Policies for bancos - all authenticated users can view
CREATE POLICY "Authenticated users can view all banks" 
ON public.bancos 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create banks" 
ON public.bancos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update banks" 
ON public.bancos 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete banks" 
ON public.bancos 
FOR DELETE 
USING (true);

-- Create templates table for communication templates
CREATE TABLE public.templates_comunicado (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  conteudo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.templates_comunicado ENABLE ROW LEVEL SECURITY;

-- Policies for templates
CREATE POLICY "Authenticated users can view all templates" 
ON public.templates_comunicado 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create templates" 
ON public.templates_comunicado 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update templates" 
ON public.templates_comunicado 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete templates" 
ON public.templates_comunicado 
FOR DELETE 
USING (true);

-- Add trigger for updated_at on both tables
CREATE TRIGGER update_bancos_updated_at
BEFORE UPDATE ON public.bancos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_comunicado_updated_at
BEFORE UPDATE ON public.templates_comunicado
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default template with variables
INSERT INTO public.templates_comunicado (nome, conteudo, ativo) VALUES (
  'Comunicado Padrão de Pagamento',
  'Olá {{NOME_MAE}}!

Informamos que seu pagamento está disponível:

📍 Banco: {{BANCO_NOME}}
📍 Endereço: {{BANCO_ENDERECO}}
💰 Valor da parcela: {{VALOR_PARCELA}}
📅 Data: {{DATA_PAGAMENTO}}

Leve seus documentos:
- RG ou CNH
- CPF: {{CPF}}

Qualquer dúvida, entre em contato conosco.

Atenciosamente,
Equipe',
  true
);