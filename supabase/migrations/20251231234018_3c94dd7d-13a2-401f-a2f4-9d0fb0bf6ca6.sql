-- Add valor column to parcelas_pagamento table
ALTER TABLE public.parcelas_pagamento 
ADD COLUMN valor DECIMAL(10,2) DEFAULT NULL;

-- Add valor_total column to pagamentos_mae table
ALTER TABLE public.pagamentos_mae 
ADD COLUMN valor_total DECIMAL(10,2) DEFAULT NULL;