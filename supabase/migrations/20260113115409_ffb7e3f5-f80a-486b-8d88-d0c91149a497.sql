-- Enable realtime for pagamentos_mae table
ALTER PUBLICATION supabase_realtime ADD TABLE public.pagamentos_mae;

-- Enable realtime for parcelas_pagamento table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.parcelas_pagamento;