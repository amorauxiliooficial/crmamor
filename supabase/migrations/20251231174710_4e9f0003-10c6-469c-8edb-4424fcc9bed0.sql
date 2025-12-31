-- Create table for tracking INSS verification checks
CREATE TABLE public.conferencia_inss (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mae_id UUID NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  houve_atualizacao BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conferencia_inss ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view all checks"
ON public.conferencia_inss
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create checks"
ON public.conferencia_inss
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own checks"
ON public.conferencia_inss
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own checks"
ON public.conferencia_inss
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_conferencia_inss_mae_id ON public.conferencia_inss(mae_id);
CREATE INDEX idx_conferencia_inss_created_at ON public.conferencia_inss(created_at DESC);