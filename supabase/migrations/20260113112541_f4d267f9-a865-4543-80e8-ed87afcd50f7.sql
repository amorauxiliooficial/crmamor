-- Create trigger to update data_ultima_atualizacao automatically when mae_processo is updated
CREATE TRIGGER update_mae_processo_ultima_atualizacao
BEFORE UPDATE ON public.mae_processo
FOR EACH ROW
EXECUTE FUNCTION public.update_data_ultima_atualizacao();