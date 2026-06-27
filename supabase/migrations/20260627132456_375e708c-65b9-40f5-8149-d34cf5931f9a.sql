
ALTER TABLE public.metas_config DROP CONSTRAINT IF EXISTS metas_config_periodo_check;
ALTER TABLE public.metas_config ADD CONSTRAINT metas_config_periodo_check
  CHECK (periodo IN ('diario','semanal','mensal') OR periodo ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
