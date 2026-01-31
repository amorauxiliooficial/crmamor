-- Tabela de atividades/interações com as mães
CREATE TABLE public.atividades_mae (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mae_id UUID NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tipo_atividade TEXT NOT NULL CHECK (tipo_atividade IN ('ligacao', 'whatsapp', 'documento', 'anotacao')),
  descricao TEXT,
  data_atividade TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configuração de prazos por status (configurável)
CREATE TABLE public.config_prazos_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_processo TEXT NOT NULL UNIQUE,
  dias_limite INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configurações padrão de prazos por status
INSERT INTO public.config_prazos_status (status_processo, dias_limite) VALUES
  ('Entrada de Documentos', 2),
  ('Em Análise', 3),
  ('Pendência Documental', 1),
  ('Elegível (Análise Positiva)', 3),
  ('Protocolo INSS', 5),
  ('Aguardando Análise INSS', 7),
  ('Aprovada', 5),
  ('Indeferida', 3),
  ('Recurso / Judicial', 7),
  ('Processo Encerrado', 30);

-- Adicionar coluna na mae_processo para data da última atividade registrada
ALTER TABLE public.mae_processo 
ADD COLUMN IF NOT EXISTS ultima_atividade_em TIMESTAMP WITH TIME ZONE;

-- Habilitar RLS
ALTER TABLE public.atividades_mae ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_prazos_status ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para atividades_mae
CREATE POLICY "Authenticated users can view all activities"
ON public.atividades_mae FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create activities"
ON public.atividades_mae FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all activities"
ON public.atividades_mae FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete all activities"
ON public.atividades_mae FOR DELETE
USING (true);

-- Políticas RLS para config_prazos_status (todos podem ver, apenas admins podem alterar)
CREATE POLICY "Authenticated users can view config"
ON public.config_prazos_status FOR SELECT
USING (true);

CREATE POLICY "Admins can manage config"
ON public.config_prazos_status FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar ultima_atividade_em quando nova atividade é inserida
CREATE OR REPLACE FUNCTION public.update_mae_ultima_atividade()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.mae_processo 
  SET ultima_atividade_em = NEW.data_atividade
  WHERE id = NEW.mae_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_ultima_atividade
AFTER INSERT ON public.atividades_mae
FOR EACH ROW
EXECUTE FUNCTION public.update_mae_ultima_atividade();

-- Habilitar realtime para atividades
ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_mae;