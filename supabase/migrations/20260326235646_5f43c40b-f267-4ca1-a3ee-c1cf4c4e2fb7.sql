
-- Create enum
CREATE TYPE public.status_prospeccao AS ENUM ('novo','em_contato','qualificado','sem_interesse','sem_resposta','convertido');

-- Create table
CREATE TABLE public.prospeccao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  telefone_e164 text,
  mes_gestacao integer,
  origem text DEFAULT 'chatbot',
  status status_prospeccao DEFAULT 'novo',
  observacoes text,
  proxima_acao text,
  proxima_acao_data timestamptz,
  mae_processo_id uuid REFERENCES public.mae_processo(id),
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_prospeccao_user_id ON public.prospeccao(user_id);
CREATE INDEX idx_prospeccao_status ON public.prospeccao(status);
CREATE INDEX idx_prospeccao_telefone ON public.prospeccao(telefone);

-- Trigger updated_at
CREATE TRIGGER set_prospeccao_updated_at
  BEFORE UPDATE ON public.prospeccao
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.prospeccao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all prospeccao"
  ON public.prospeccao FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create prospeccao"
  ON public.prospeccao FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all prospeccao"
  ON public.prospeccao FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete all prospeccao"
  ON public.prospeccao FOR DELETE TO authenticated
  USING (true);
