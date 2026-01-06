-- Tabela para itens de onboarding (customizáveis pelo admin)
CREATE TABLE public.onboarding_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'geral', -- 'treinamento' ou 'documentacao'
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para progresso do funcionário
CREATE TABLE public.onboarding_progresso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.onboarding_items(id) ON DELETE CASCADE,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Enable RLS
ALTER TABLE public.onboarding_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progresso ENABLE ROW LEVEL SECURITY;

-- Policies para onboarding_items (todos autenticados podem ver, admins podem gerenciar)
CREATE POLICY "Authenticated users can view active onboarding items"
  ON public.onboarding_items FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admins can manage onboarding items"
  ON public.onboarding_items FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policies para onboarding_progresso
CREATE POLICY "Users can view their own progress"
  ON public.onboarding_progresso FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own progress"
  ON public.onboarding_progresso FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.onboarding_progresso FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_onboarding_items_updated_at
  BEFORE UPDATE ON public.onboarding_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_progresso_updated_at
  BEFORE UPDATE ON public.onboarding_progresso
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns itens padrão
INSERT INTO public.onboarding_items (titulo, descricao, categoria, ordem) VALUES
  ('Política da empresa', 'Leitura e compreensão das políticas internas', 'treinamento', 1),
  ('Treinamento de sistemas', 'Uso dos sistemas internos da empresa', 'treinamento', 2),
  ('Segurança da informação', 'Boas práticas de segurança digital', 'treinamento', 3),
  ('Contrato assinado', 'Assinatura do contrato de trabalho', 'documentacao', 4),
  ('Documentos entregues', 'Entrega de todos os documentos necessários', 'documentacao', 5),
  ('Cadastro no sistema', 'Finalização do cadastro no sistema interno', 'documentacao', 6);