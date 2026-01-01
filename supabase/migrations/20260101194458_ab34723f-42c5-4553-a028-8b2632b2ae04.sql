-- Tabela para registro de ações com data e hora
CREATE TABLE public.acoes_indicacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicacao_id UUID NOT NULL REFERENCES public.indicacoes(id) ON DELETE CASCADE,
  tipo_acao TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.acoes_indicacao ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view all actions" 
ON public.acoes_indicacao 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create actions" 
ON public.acoes_indicacao 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete actions" 
ON public.acoes_indicacao 
FOR DELETE 
USING (true);