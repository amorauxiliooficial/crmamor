-- Create table for indications/referrals
CREATE TABLE public.indicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_indicacao timestamp with time zone NOT NULL DEFAULT now(),
  nome_indicada text NOT NULL,
  telefone_indicada text,
  nome_indicadora text,
  telefone_indicadora text,
  status_abordagem text NOT NULL DEFAULT 'pendente',
  motivo_abordagem text,
  observacoes text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view all indications"
ON public.indicacoes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create indications"
ON public.indicacoes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all indications"
ON public.indicacoes
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete all indications"
ON public.indicacoes
FOR DELETE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_indicacoes_updated_at
BEFORE UPDATE ON public.indicacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();