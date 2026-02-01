-- Create fornecedores table
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cnpj_cpf TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on nome (case insensitive)
CREATE UNIQUE INDEX fornecedores_nome_unique ON public.fornecedores (LOWER(nome));

-- Enable RLS
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view all fornecedores"
ON public.fornecedores
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create fornecedores"
ON public.fornecedores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all fornecedores"
ON public.fornecedores
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete all fornecedores"
ON public.fornecedores
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_fornecedores_updated_at
BEFORE UPDATE ON public.fornecedores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key to despesas table (optional, for existing fornecedor field we'll use the name)
ALTER TABLE public.despesas ADD COLUMN fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL;