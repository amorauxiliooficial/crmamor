-- Tabela para armazenar senhas de sistemas
CREATE TABLE public.senhas_sistemas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_sistema TEXT NOT NULL,
  login TEXT NOT NULL,
  senha TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.senhas_sistemas ENABLE ROW LEVEL SECURITY;

-- Política: todos os usuários autenticados podem ver
CREATE POLICY "Authenticated users can view passwords"
ON public.senhas_sistemas
FOR SELECT
TO authenticated
USING (true);

-- Política: todos os usuários autenticados podem inserir
CREATE POLICY "Authenticated users can insert passwords"
ON public.senhas_sistemas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: todos os usuários autenticados podem atualizar
CREATE POLICY "Authenticated users can update passwords"
ON public.senhas_sistemas
FOR UPDATE
TO authenticated
USING (true);

-- Política: todos os usuários autenticados podem deletar
CREATE POLICY "Authenticated users can delete passwords"
ON public.senhas_sistemas
FOR DELETE
TO authenticated
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_senhas_sistemas_updated_at
BEFORE UPDATE ON public.senhas_sistemas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();