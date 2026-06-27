
-- acoes_indicacao
DROP POLICY IF EXISTS "Authenticated users can create actions" ON public.acoes_indicacao;
DROP POLICY IF EXISTS "Authenticated users can delete actions" ON public.acoes_indicacao;
DROP POLICY IF EXISTS "Authenticated users can view all actions" ON public.acoes_indicacao;
CREATE POLICY "acoes_indicacao_select" ON public.acoes_indicacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "acoes_indicacao_insert" ON public.acoes_indicacao FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "acoes_indicacao_delete" ON public.acoes_indicacao FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- alertas_mae
DROP POLICY IF EXISTS "Admins can create alerts" ON public.alertas_mae;
DROP POLICY IF EXISTS "Admins can manage all alerts" ON public.alertas_mae;
DROP POLICY IF EXISTS "Users can mark alerts as read" ON public.alertas_mae;
DROP POLICY IF EXISTS "Users can view their alerts" ON public.alertas_mae;
CREATE POLICY "alertas_admin_all" ON public.alertas_mae FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "alertas_select_own" ON public.alertas_mae FOR SELECT TO authenticated USING ((destinatario_id = auth.uid()) OR (destinatario_id IS NULL) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "alertas_update_own" ON public.alertas_mae FOR UPDATE TO authenticated USING ((destinatario_id = auth.uid()) OR (destinatario_id IS NULL)) WITH CHECK ((destinatario_id = auth.uid()) OR (destinatario_id IS NULL));

-- assignment_events
DROP POLICY IF EXISTS "Authenticated users can create assignment events" ON public.assignment_events;
DROP POLICY IF EXISTS "Authenticated users can view all assignment events" ON public.assignment_events;
CREATE POLICY "assignment_events_select" ON public.assignment_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "assignment_events_insert" ON public.assignment_events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- atividades_mae
DROP POLICY IF EXISTS "Authenticated users can create activities" ON public.atividades_mae;
DROP POLICY IF EXISTS "Authenticated users can delete all activities" ON public.atividades_mae;
DROP POLICY IF EXISTS "Authenticated users can update all activities" ON public.atividades_mae;
DROP POLICY IF EXISTS "Authenticated users can view all activities" ON public.atividades_mae;
CREATE POLICY "atividades_mae_select" ON public.atividades_mae FOR SELECT TO authenticated USING (true);
CREATE POLICY "atividades_mae_insert" ON public.atividades_mae FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "atividades_mae_update" ON public.atividades_mae FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "atividades_mae_delete" ON public.atividades_mae FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- bancos
DROP POLICY IF EXISTS "Authenticated users can create banks" ON public.bancos;
DROP POLICY IF EXISTS "Authenticated users can delete banks" ON public.bancos;
DROP POLICY IF EXISTS "Authenticated users can update banks" ON public.bancos;
DROP POLICY IF EXISTS "Authenticated users can view all banks" ON public.bancos;
CREATE POLICY "bancos_select" ON public.bancos FOR SELECT TO authenticated USING (true);
CREATE POLICY "bancos_insert" ON public.bancos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bancos_update" ON public.bancos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bancos_delete" ON public.bancos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- config_prazos_status
DROP POLICY IF EXISTS "Admins can manage config" ON public.config_prazos_status;
DROP POLICY IF EXISTS "Authenticated users can view config" ON public.config_prazos_status;
CREATE POLICY "config_prazos_select" ON public.config_prazos_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_prazos_admin" ON public.config_prazos_status FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- fornecedores
DROP POLICY IF EXISTS "Authenticated users can create fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated users can delete all fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated users can update all fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated users can view all fornecedores" ON public.fornecedores;
CREATE POLICY "fornecedores_select" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "fornecedores_insert" ON public.fornecedores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fornecedores_update" ON public.fornecedores FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "fornecedores_delete" ON public.fornecedores FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- indicacoes
DROP POLICY IF EXISTS "Authenticated users can create indications" ON public.indicacoes;
DROP POLICY IF EXISTS "Authenticated users can delete all indications" ON public.indicacoes;
DROP POLICY IF EXISTS "Authenticated users can update all indications" ON public.indicacoes;
DROP POLICY IF EXISTS "Authenticated users can view all indications" ON public.indicacoes;
CREATE POLICY "indicacoes_select" ON public.indicacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "indicacoes_insert" ON public.indicacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "indicacoes_update" ON public.indicacoes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "indicacoes_delete" ON public.indicacoes FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- mae_atendentes
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.mae_atendentes;
DROP POLICY IF EXISTS "Authenticated users can view all assignments" ON public.mae_atendentes;
CREATE POLICY "mae_atendentes_select" ON public.mae_atendentes FOR SELECT TO authenticated USING (true);
CREATE POLICY "mae_atendentes_admin" ON public.mae_atendentes FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- mother_contacts
DROP POLICY IF EXISTS "Authenticated users can create contacts" ON public.mother_contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.mother_contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.mother_contacts;
DROP POLICY IF EXISTS "Authenticated users can view all contacts" ON public.mother_contacts;
CREATE POLICY "mother_contacts_select" ON public.mother_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "mother_contacts_insert" ON public.mother_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "mother_contacts_update" ON public.mother_contacts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "mother_contacts_delete" ON public.mother_contacts FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- onboarding_items: admin only
DROP POLICY IF EXISTS "Admins can manage onboarding items" ON public.onboarding_items;
DROP POLICY IF EXISTS "Authenticated users can view active onboarding items" ON public.onboarding_items;
CREATE POLICY "onboarding_items_admin_select" ON public.onboarding_items FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "onboarding_items_admin_all" ON public.onboarding_items FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- onboarding_progresso
DROP POLICY IF EXISTS "Users can manage their own progress" ON public.onboarding_progresso;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.onboarding_progresso;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.onboarding_progresso;
CREATE POLICY "onb_progress_select" ON public.onboarding_progresso FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "onb_progress_insert" ON public.onboarding_progresso FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "onb_progress_update" ON public.onboarding_progresso FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- pagamentos_mae
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.pagamentos_mae;
DROP POLICY IF EXISTS "Authenticated users can delete all payments" ON public.pagamentos_mae;
DROP POLICY IF EXISTS "Authenticated users can update all payments" ON public.pagamentos_mae;
DROP POLICY IF EXISTS "Authenticated users can view all payments" ON public.pagamentos_mae;
CREATE POLICY "pagamentos_mae_select" ON public.pagamentos_mae FOR SELECT TO authenticated USING (true);
CREATE POLICY "pagamentos_mae_insert" ON public.pagamentos_mae FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pagamentos_mae_update" ON public.pagamentos_mae FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pagamentos_mae_delete" ON public.pagamentos_mae FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- parcelas_pagamento
DROP POLICY IF EXISTS "Authenticated users can create installments" ON public.parcelas_pagamento;
DROP POLICY IF EXISTS "Authenticated users can delete all installments" ON public.parcelas_pagamento;
DROP POLICY IF EXISTS "Authenticated users can update all installments" ON public.parcelas_pagamento;
DROP POLICY IF EXISTS "Authenticated users can view all installments" ON public.parcelas_pagamento;
CREATE POLICY "parcelas_pag_select" ON public.parcelas_pagamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "parcelas_pag_insert" ON public.parcelas_pagamento FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "parcelas_pag_update" ON public.parcelas_pagamento FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "parcelas_pag_delete" ON public.parcelas_pagamento FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- pre_analise
DROP POLICY IF EXISTS "Authenticated users can create analyses" ON public.pre_analise;
DROP POLICY IF EXISTS "Authenticated users can update analyses" ON public.pre_analise;
DROP POLICY IF EXISTS "Authenticated users can view all analyses" ON public.pre_analise;
CREATE POLICY "pre_analise_select" ON public.pre_analise FOR SELECT TO authenticated USING (true);
CREATE POLICY "pre_analise_insert" ON public.pre_analise FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pre_analise_update" ON public.pre_analise FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- tarefa_responsaveis
DROP POLICY IF EXISTS "Admins can create assignments" ON public.tarefa_responsaveis;
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.tarefa_responsaveis;
DROP POLICY IF EXISTS "Admins can view all assignments" ON public.tarefa_responsaveis;
CREATE POLICY "tarefa_resp_select" ON public.tarefa_responsaveis FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "tarefa_resp_insert" ON public.tarefa_responsaveis FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "tarefa_resp_delete" ON public.tarefa_responsaveis FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- tarefas_internas
DROP POLICY IF EXISTS "Admins can create tasks" ON public.tarefas_internas;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tarefas_internas;
DROP POLICY IF EXISTS "Admins can update tasks" ON public.tarefas_internas;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tarefas_internas;
CREATE POLICY "tarefas_int_select" ON public.tarefas_internas FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "tarefas_int_insert" ON public.tarefas_internas FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "tarefas_int_update" ON public.tarefas_internas FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "tarefas_int_delete" ON public.tarefas_internas FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- templates_comunicado
DROP POLICY IF EXISTS "Authenticated users can create templates" ON public.templates_comunicado;
DROP POLICY IF EXISTS "Authenticated users can delete templates" ON public.templates_comunicado;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON public.templates_comunicado;
DROP POLICY IF EXISTS "Authenticated users can view all templates" ON public.templates_comunicado;
CREATE POLICY "templates_select" ON public.templates_comunicado FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates_insert" ON public.templates_comunicado FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "templates_update" ON public.templates_comunicado FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "templates_delete" ON public.templates_comunicado FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- timeline_events
DROP POLICY IF EXISTS "Authenticated users can create timeline events" ON public.timeline_events;
DROP POLICY IF EXISTS "Authenticated users can delete timeline events" ON public.timeline_events;
DROP POLICY IF EXISTS "Authenticated users can view all timeline events" ON public.timeline_events;
CREATE POLICY "timeline_select" ON public.timeline_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "timeline_insert" ON public.timeline_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "timeline_delete" ON public.timeline_events FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- verificacao_gestante
DROP POLICY IF EXISTS "Authenticated users can create verifications" ON public.verificacao_gestante;
DROP POLICY IF EXISTS "Authenticated users can delete verifications" ON public.verificacao_gestante;
DROP POLICY IF EXISTS "Authenticated users can update verifications" ON public.verificacao_gestante;
DROP POLICY IF EXISTS "Authenticated users can view all verifications" ON public.verificacao_gestante;
CREATE POLICY "verif_gest_select" ON public.verificacao_gestante FOR SELECT TO authenticated USING (true);
CREATE POLICY "verif_gest_insert" ON public.verificacao_gestante FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verif_gest_update" ON public.verificacao_gestante FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "verif_gest_delete" ON public.verificacao_gestante FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- wa_conversations
DROP POLICY IF EXISTS "Authenticated users can delete conversations" ON public.wa_conversations;
DROP POLICY IF EXISTS "Authenticated users can insert conversations" ON public.wa_conversations;
DROP POLICY IF EXISTS "Authenticated users can update conversations" ON public.wa_conversations;
DROP POLICY IF EXISTS "Authenticated users can view all conversations" ON public.wa_conversations;
CREATE POLICY "wa_conv_select" ON public.wa_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "wa_conv_insert" ON public.wa_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "wa_conv_update" ON public.wa_conversations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "wa_conv_delete" ON public.wa_conversations FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- wa_messages (preserve agent edit policy)
DROP POLICY IF EXISTS "Authenticated users can delete messages" ON public.wa_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.wa_messages;
DROP POLICY IF EXISTS "Authenticated users can view all messages" ON public.wa_messages;
CREATE POLICY "wa_msg_select" ON public.wa_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "wa_msg_insert" ON public.wa_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "wa_msg_delete" ON public.wa_messages FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- mae_processo: tighten write true→auth.uid() IS NOT NULL
DROP POLICY IF EXISTS "Authenticated users can delete all processes" ON public.mae_processo;
DROP POLICY IF EXISTS "Authenticated users can update all processes" ON public.mae_processo;
CREATE POLICY "mae_processo_update" ON public.mae_processo FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "mae_processo_delete" ON public.mae_processo FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- central_financeira
DROP POLICY IF EXISTS "auth insert central_financeira" ON public.central_financeira;
DROP POLICY IF EXISTS "auth update central_financeira" ON public.central_financeira;
DROP POLICY IF EXISTS "auth delete central_financeira" ON public.central_financeira;
CREATE POLICY "cf_insert" ON public.central_financeira FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cf_update" ON public.central_financeira FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cf_delete" ON public.central_financeira FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- boletos_amor & parcelas_beneficio
DROP POLICY IF EXISTS "auth all boletos_amor" ON public.boletos_amor;
CREATE POLICY "boletos_select" ON public.boletos_amor FOR SELECT TO authenticated USING (true);
CREATE POLICY "boletos_insert" ON public.boletos_amor FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "boletos_update" ON public.boletos_amor FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "boletos_delete" ON public.boletos_amor FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth all parcelas_beneficio" ON public.parcelas_beneficio;
CREATE POLICY "parc_ben_select" ON public.parcelas_beneficio FOR SELECT TO authenticated USING (true);
CREATE POLICY "parc_ben_insert" ON public.parcelas_beneficio FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "parc_ben_update" ON public.parcelas_beneficio FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "parc_ben_delete" ON public.parcelas_beneficio FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- conversation_phone_aliases
DROP POLICY IF EXISTS "Authenticated users can manage aliases" ON public.conversation_phone_aliases;
CREATE POLICY "cpa_select" ON public.conversation_phone_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "cpa_insert" ON public.conversation_phone_aliases FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cpa_update" ON public.conversation_phone_aliases FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cpa_delete" ON public.conversation_phone_aliases FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- senhas_sistemas: admin only
DROP POLICY IF EXISTS "Authenticated users can delete passwords" ON public.senhas_sistemas;
DROP POLICY IF EXISTS "Authenticated users can insert passwords" ON public.senhas_sistemas;
DROP POLICY IF EXISTS "Authenticated users can update passwords" ON public.senhas_sistemas;
DROP POLICY IF EXISTS "Authenticated users can view passwords" ON public.senhas_sistemas;
CREATE POLICY "senhas_admin_all" ON public.senhas_sistemas FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- lead_intake: enable RLS
ALTER TABLE public.lead_intake ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_intake TO authenticated;
GRANT ALL ON public.lead_intake TO service_role;
CREATE POLICY "lead_intake_select" ON public.lead_intake FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_intake_insert" ON public.lead_intake FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "lead_intake_update" ON public.lead_intake FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "lead_intake_delete" ON public.lead_intake FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- wa-media storage
DROP POLICY IF EXISTS "Anyone can view WhatsApp media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view WhatsApp media" ON storage.objects;
CREATE POLICY "Authenticated can view WA media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'wa-media');

-- realtime.messages
DO $$ BEGIN
  EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "auth_realtime_messages" ON realtime.messages FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- search_path + revoke EXECUTE on internal definer functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_mae_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_data_ultima_atualizacao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_mae_ultima_atividade() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_tarefa_status_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_migrations_in_period(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_cpf(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_next_analise_version(uuid) FROM PUBLIC, anon;
