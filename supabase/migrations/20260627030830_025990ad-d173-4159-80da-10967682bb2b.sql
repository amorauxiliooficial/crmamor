
ALTER TABLE public.metas_config DROP CONSTRAINT IF EXISTS metas_config_tipo_meta_check;
ALTER TABLE public.metas_config ADD CONSTRAINT metas_config_tipo_meta_check
  CHECK (tipo_meta = ANY (ARRAY['cadastros','contratos','aprovados','atividades','follow_ups','receita']));

INSERT INTO public.metas_config (nome, descricao, tipo_meta, valor_meta, periodo, ativo)
SELECT 'Meta Financeira Mensal', 'Meta de receita projetada do mês', 'receita', 0, 'mensal', true
WHERE NOT EXISTS (SELECT 1 FROM public.metas_config WHERE tipo_meta = 'receita');
