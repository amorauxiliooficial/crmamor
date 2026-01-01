-- Create table for gestante verifications
CREATE TABLE public.verificacao_gestante (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mae_id UUID NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  verificado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizacao_realizada TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verificacao_gestante ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view all verifications"
ON public.verificacao_gestante
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create verifications"
ON public.verificacao_gestante
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update verifications"
ON public.verificacao_gestante
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete verifications"
ON public.verificacao_gestante
FOR DELETE
USING (true);

-- Create index for faster queries
CREATE INDEX idx_verificacao_gestante_mae_id ON public.verificacao_gestante(mae_id);
CREATE INDEX idx_verificacao_gestante_verificado_em ON public.verificacao_gestante(verificado_em DESC);