-- Tabela de configuração de metas (admin define)
CREATE TABLE public.metas_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  tipo_meta text NOT NULL CHECK (tipo_meta IN ('cadastros', 'contratos', 'aprovados', 'atividades', 'follow_ups')),
  valor_meta integer NOT NULL DEFAULT 10,
  periodo text NOT NULL DEFAULT 'mensal' CHECK (periodo IN ('diario', 'semanal', 'mensal')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metas_config ENABLE ROW LEVEL SECURITY;

-- Everyone can view metas
CREATE POLICY "Authenticated users can view metas"
ON public.metas_config
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage metas
CREATE POLICY "Admins can manage metas"
ON public.metas_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default metas
INSERT INTO public.metas_config (nome, descricao, tipo_meta, valor_meta, periodo) VALUES
  ('Novos Cadastros', 'Quantidade de mães cadastradas', 'cadastros', 20, 'mensal'),
  ('Contratos Assinados', 'Mães que assinaram contrato', 'contratos', 15, 'mensal'),
  ('Processos Aprovados', 'Processos que chegaram a Aprovada', 'aprovados', 10, 'mensal'),
  ('Atividades Realizadas', 'Ligações, WhatsApp, reuniões', 'atividades', 50, 'mensal');

-- Trigger for updated_at
CREATE TRIGGER update_metas_config_updated_at
BEFORE UPDATE ON public.metas_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();