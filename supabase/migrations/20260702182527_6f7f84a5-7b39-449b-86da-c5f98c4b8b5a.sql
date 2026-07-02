
-- boletos_amor
DROP POLICY IF EXISTS boletos_select ON public.boletos_amor;
DROP POLICY IF EXISTS boletos_insert ON public.boletos_amor;
DROP POLICY IF EXISTS boletos_update ON public.boletos_amor;
DROP POLICY IF EXISTS boletos_delete ON public.boletos_amor;
CREATE POLICY boletos_select ON public.boletos_amor FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY boletos_insert ON public.boletos_amor FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY boletos_update ON public.boletos_amor FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY boletos_delete ON public.boletos_amor FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- central_alteracoes_log
DROP POLICY IF EXISTS "auth select alteracoes_log" ON public.central_alteracoes_log;
CREATE POLICY "staff select alteracoes_log" ON public.central_alteracoes_log FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- central_comunicados_historico
DROP POLICY IF EXISTS "auth select comunicados_historico" ON public.central_comunicados_historico;
CREATE POLICY "staff select comunicados_historico" ON public.central_comunicados_historico FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- central_financeira
DROP POLICY IF EXISTS cf_insert ON public.central_financeira;
DROP POLICY IF EXISTS cf_update ON public.central_financeira;
DROP POLICY IF EXISTS cf_delete ON public.central_financeira;
CREATE POLICY cf_insert ON public.central_financeira FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY cf_update ON public.central_financeira FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY cf_delete ON public.central_financeira FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- fornecedores
DROP POLICY IF EXISTS fornecedores_insert ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_update ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_delete ON public.fornecedores;
CREATE POLICY fornecedores_insert ON public.fornecedores FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY fornecedores_update ON public.fornecedores FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY fornecedores_delete ON public.fornecedores FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- lead_intake
DROP POLICY IF EXISTS lead_intake_insert ON public.lead_intake;
DROP POLICY IF EXISTS lead_intake_update ON public.lead_intake;
DROP POLICY IF EXISTS lead_intake_delete ON public.lead_intake;
CREATE POLICY lead_intake_insert ON public.lead_intake FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY lead_intake_update ON public.lead_intake FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY lead_intake_delete ON public.lead_intake FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- mae_processo
DROP POLICY IF EXISTS mae_processo_delete ON public.mae_processo;
DROP POLICY IF EXISTS mae_processo_update ON public.mae_processo;
CREATE POLICY mae_processo_update ON public.mae_processo FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY mae_processo_delete ON public.mae_processo FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- mother_contacts
DROP POLICY IF EXISTS mother_contacts_insert ON public.mother_contacts;
DROP POLICY IF EXISTS mother_contacts_update ON public.mother_contacts;
DROP POLICY IF EXISTS mother_contacts_delete ON public.mother_contacts;
CREATE POLICY mother_contacts_insert ON public.mother_contacts FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY mother_contacts_update ON public.mother_contacts FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY mother_contacts_delete ON public.mother_contacts FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- wa_conversations
DROP POLICY IF EXISTS wa_conv_insert ON public.wa_conversations;
DROP POLICY IF EXISTS wa_conv_update ON public.wa_conversations;
DROP POLICY IF EXISTS wa_conv_delete ON public.wa_conversations;
CREATE POLICY wa_conv_insert ON public.wa_conversations FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY wa_conv_update ON public.wa_conversations FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY wa_conv_delete ON public.wa_conversations FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- wa_messages
DROP POLICY IF EXISTS wa_msg_insert ON public.wa_messages;
DROP POLICY IF EXISTS wa_msg_delete ON public.wa_messages;
CREATE POLICY wa_msg_insert ON public.wa_messages FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY wa_msg_delete ON public.wa_messages FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- parcelas_beneficio
DROP POLICY IF EXISTS parc_ben_select ON public.parcelas_beneficio;
DROP POLICY IF EXISTS parc_ben_insert ON public.parcelas_beneficio;
DROP POLICY IF EXISTS parc_ben_update ON public.parcelas_beneficio;
DROP POLICY IF EXISTS parc_ben_delete ON public.parcelas_beneficio;
CREATE POLICY parc_ben_select ON public.parcelas_beneficio FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY parc_ben_insert ON public.parcelas_beneficio FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY parc_ben_update ON public.parcelas_beneficio FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY parc_ben_delete ON public.parcelas_beneficio FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- parcelas_pagamento
DROP POLICY IF EXISTS parcelas_pag_select ON public.parcelas_pagamento;
DROP POLICY IF EXISTS parcelas_pag_insert ON public.parcelas_pagamento;
DROP POLICY IF EXISTS parcelas_pag_update ON public.parcelas_pagamento;
DROP POLICY IF EXISTS parcelas_pag_delete ON public.parcelas_pagamento;
CREATE POLICY parcelas_pag_select ON public.parcelas_pagamento FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY parcelas_pag_insert ON public.parcelas_pagamento FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY parcelas_pag_update ON public.parcelas_pagamento FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY parcelas_pag_delete ON public.parcelas_pagamento FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- pagamentos_mae
DROP POLICY IF EXISTS pagamentos_mae_select ON public.pagamentos_mae;
DROP POLICY IF EXISTS pagamentos_mae_insert ON public.pagamentos_mae;
DROP POLICY IF EXISTS pagamentos_mae_update ON public.pagamentos_mae;
DROP POLICY IF EXISTS pagamentos_mae_delete ON public.pagamentos_mae;
CREATE POLICY pagamentos_mae_select ON public.pagamentos_mae FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY pagamentos_mae_insert ON public.pagamentos_mae FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY pagamentos_mae_update ON public.pagamentos_mae FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY pagamentos_mae_delete ON public.pagamentos_mae FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- indicacoes
DROP POLICY IF EXISTS indicacoes_update ON public.indicacoes;
DROP POLICY IF EXISTS indicacoes_delete ON public.indicacoes;
CREATE POLICY indicacoes_update ON public.indicacoes FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY indicacoes_delete ON public.indicacoes FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- pre_analise
DROP POLICY IF EXISTS pre_analise_update ON public.pre_analise;
CREATE POLICY pre_analise_update ON public.pre_analise FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- storage: wa-media uploads only via service_role
DROP POLICY IF EXISTS "Service role can upload WhatsApp media" ON storage.objects;
CREATE POLICY "Service role can upload WhatsApp media" ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'wa-media');
