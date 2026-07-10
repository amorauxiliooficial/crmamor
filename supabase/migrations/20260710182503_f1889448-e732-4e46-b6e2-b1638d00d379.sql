
-- Rebackfill: usar vencimento como data real da baixa histórica
UPDATE public.parcelas_pagamento
   SET pago_em = data_pagamento
 WHERE status = 'pago' AND data_pagamento IS NOT NULL;

UPDATE public.boletos_amor
   SET pago_em = vencimento
 WHERE status = 'pago' AND vencimento IS NOT NULL;
