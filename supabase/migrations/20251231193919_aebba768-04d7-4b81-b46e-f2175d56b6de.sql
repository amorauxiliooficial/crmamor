-- Create table for payment control
CREATE TABLE public.pagamentos_mae (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mae_id UUID NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tipo_pagamento TEXT NOT NULL DEFAULT 'parcelado', -- 'a_vista' ou 'parcelado'
  total_parcelas INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for individual payments/installments
CREATE TABLE public.parcelas_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pagamento_id UUID NOT NULL REFERENCES public.pagamentos_mae(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'pago', 'inadimplente'
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pagamentos_mae ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas_pagamento ENABLE ROW LEVEL SECURITY;

-- RLS policies for pagamentos_mae
CREATE POLICY "Authenticated users can view all payments"
ON public.pagamentos_mae FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create payments"
ON public.pagamentos_mae FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all payments"
ON public.pagamentos_mae FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete all payments"
ON public.pagamentos_mae FOR DELETE
USING (true);

-- RLS policies for parcelas_pagamento
CREATE POLICY "Authenticated users can view all installments"
ON public.parcelas_pagamento FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create installments"
ON public.parcelas_pagamento FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update all installments"
ON public.parcelas_pagamento FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete all installments"
ON public.parcelas_pagamento FOR DELETE
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_pagamentos_mae_updated_at
BEFORE UPDATE ON public.pagamentos_mae
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parcelas_pagamento_updated_at
BEFORE UPDATE ON public.parcelas_pagamento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();