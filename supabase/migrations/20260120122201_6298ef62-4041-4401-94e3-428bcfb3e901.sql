-- Add commission percentage to mae_processo table
ALTER TABLE public.mae_processo 
ADD COLUMN IF NOT EXISTS percentual_comissao numeric DEFAULT NULL;

-- Add commission percentage to pagamentos_mae for tracking
ALTER TABLE public.pagamentos_mae 
ADD COLUMN IF NOT EXISTS percentual_comissao numeric DEFAULT NULL;

-- Add commission value to parcelas_pagamento for individual tracking
ALTER TABLE public.parcelas_pagamento 
ADD COLUMN IF NOT EXISTS valor_comissao numeric DEFAULT NULL;