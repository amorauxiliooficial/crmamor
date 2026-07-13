
-- Tighten write policies to staff only across sensitive tables

-- acoes_indicacao: restrict DELETE to staff
DROP POLICY IF EXISTS acoes_indicacao_delete ON public.acoes_indicacao;
CREATE POLICY acoes_indicacao_delete ON public.acoes_indicacao FOR DELETE USING (public.is_staff(auth.uid()));

-- assignment_events: restrict INSERT to staff
DROP POLICY IF EXISTS assignment_events_insert ON public.assignment_events;
CREATE POLICY assignment_events_insert ON public.assignment_events FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

-- atendentes_comunicado: restrict writes to staff
DROP POLICY IF EXISTS "Authenticated can delete atendentes" ON public.atendentes_comunicado;
DROP POLICY IF EXISTS "Authenticated can insert atendentes" ON public.atendentes_comunicado;
DROP POLICY IF EXISTS "Authenticated can update atendentes" ON public.atendentes_comunicado;
CREATE POLICY atendentes_comunicado_insert ON public.atendentes_comunicado FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY atendentes_comunicado_update ON public.atendentes_comunicado FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY atendentes_comunicado_delete ON public.atendentes_comunicado FOR DELETE USING (public.is_staff(auth.uid()));

-- atividades_mae: restrict UPDATE/DELETE to staff
DROP POLICY IF EXISTS atividades_mae_delete ON public.atividades_mae;
DROP POLICY IF EXISTS atividades_mae_update ON public.atividades_mae;
CREATE POLICY atividades_mae_delete ON public.atividades_mae FOR DELETE USING (public.is_staff(auth.uid()));
CREATE POLICY atividades_mae_update ON public.atividades_mae FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- bancos: restrict writes to staff
DROP POLICY IF EXISTS bancos_delete ON public.bancos;
DROP POLICY IF EXISTS bancos_insert ON public.bancos;
DROP POLICY IF EXISTS bancos_update ON public.bancos;
CREATE POLICY bancos_insert ON public.bancos FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY bancos_update ON public.bancos FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY bancos_delete ON public.bancos FOR DELETE USING (public.is_staff(auth.uid()));

-- conversation_phone_aliases: restrict writes to staff
DROP POLICY IF EXISTS cpa_delete ON public.conversation_phone_aliases;
DROP POLICY IF EXISTS cpa_insert ON public.conversation_phone_aliases;
DROP POLICY IF EXISTS cpa_update ON public.conversation_phone_aliases;
CREATE POLICY cpa_insert ON public.conversation_phone_aliases FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY cpa_update ON public.conversation_phone_aliases FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY cpa_delete ON public.conversation_phone_aliases FOR DELETE USING (public.is_staff(auth.uid()));

-- templates_comunicado: restrict writes to staff
DROP POLICY IF EXISTS templates_delete ON public.templates_comunicado;
DROP POLICY IF EXISTS templates_insert ON public.templates_comunicado;
DROP POLICY IF EXISTS templates_update ON public.templates_comunicado;
CREATE POLICY templates_insert ON public.templates_comunicado FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY templates_update ON public.templates_comunicado FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY templates_delete ON public.templates_comunicado FOR DELETE USING (public.is_staff(auth.uid()));

-- timeline_events: restrict DELETE to staff
DROP POLICY IF EXISTS timeline_delete ON public.timeline_events;
CREATE POLICY timeline_delete ON public.timeline_events FOR DELETE USING (public.is_staff(auth.uid()));

-- verificacao_gestante: restrict UPDATE/DELETE to staff
DROP POLICY IF EXISTS verif_gest_delete ON public.verificacao_gestante;
DROP POLICY IF EXISTS verif_gest_update ON public.verificacao_gestante;
CREATE POLICY verif_gest_delete ON public.verificacao_gestante FOR DELETE USING (public.is_staff(auth.uid()));
CREATE POLICY verif_gest_update ON public.verificacao_gestante FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- wa_billing_events: restrict INSERT to staff (service_role bypasses RLS)
DROP POLICY IF EXISTS "Service can insert billing events" ON public.wa_billing_events;
CREATE POLICY wa_billing_events_insert ON public.wa_billing_events FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

-- Revoke EXECUTE on internal SECURITY DEFINER helper functions from anon/PUBLIC
REVOKE EXECUTE ON FUNCTION public.ensure_pagamento_mae(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.gerar_comissao_parcela(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recalc_pagamento_totais(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_boleto_delete() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_boleto_to_parcela() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_migrations_in_period(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_mae_status_change() FROM PUBLIC, anon;
