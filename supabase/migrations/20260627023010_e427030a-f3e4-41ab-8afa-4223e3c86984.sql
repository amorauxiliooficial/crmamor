
-- =====================================================
-- 1. Storage: documentos-preanalise — drop broad policies
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;

-- =====================================================
-- 2. Storage: wa-media — staff-only policies
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can view WA media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload WhatsApp media" ON storage.objects;

CREATE POLICY "wa_media_staff_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'wa-media' AND public.is_staff(auth.uid()));

CREATE POLICY "wa_media_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wa-media' AND public.is_staff(auth.uid()));

CREATE POLICY "wa_media_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'wa-media' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'wa-media' AND public.is_staff(auth.uid()));

CREATE POLICY "wa_media_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'wa-media' AND public.is_staff(auth.uid()));

-- =====================================================
-- 3. Public bucket listing — drop broad SELECT (publicUrl still works)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view task images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view onboarding files" ON storage.objects;

-- =====================================================
-- 4. Replace always-true INSERT/UPDATE/DELETE policies with is_staff()
-- =====================================================
DROP POLICY IF EXISTS "auth insert alteracoes_log" ON public.central_alteracoes_log;
CREATE POLICY "staff insert alteracoes_log" ON public.central_alteracoes_log
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "auth insert comunicados_historico" ON public.central_comunicados_historico;
CREATE POLICY "staff insert comunicados_historico" ON public.central_comunicados_historico
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create checklists" ON public.checklist_mae;
CREATE POLICY "Staff can create checklists" ON public.checklist_mae
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can update all checklists" ON public.checklist_mae;
CREATE POLICY "Staff can update checklists" ON public.checklist_mae
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can delete all checklists" ON public.checklist_mae;
CREATE POLICY "Staff can delete checklists" ON public.checklist_mae
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update all checks" ON public.conferencia_inss;
CREATE POLICY "Staff can update INSS checks" ON public.conferencia_inss
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can delete all checks" ON public.conferencia_inss;
CREATE POLICY "Staff can delete INSS checks" ON public.conferencia_inss
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create events" ON public.conversation_events;
CREATE POLICY "Staff can create conversation events" ON public.conversation_events
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create transfers" ON public.conversation_transfers;
CREATE POLICY "Staff can create transfers" ON public.conversation_transfers
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create criativos" ON public.criativos;
CREATE POLICY "Staff can create criativos" ON public.criativos
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can update criativos" ON public.criativos;
CREATE POLICY "Staff can update criativos" ON public.criativos
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can delete criativos" ON public.criativos;
CREATE POLICY "Staff can delete criativos" ON public.criativos
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create decisions" ON public.decisao_processo;
CREATE POLICY "Staff can create decisions" ON public.decisao_processo
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can update all decisions" ON public.decisao_processo;
CREATE POLICY "Staff can update decisions" ON public.decisao_processo
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can delete all decisions" ON public.decisao_processo;
CREATE POLICY "Staff can delete decisions" ON public.decisao_processo
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create dev logs" ON public.desenvolvimento_log;
CREATE POLICY "Staff can create dev logs" ON public.desenvolvimento_log
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can update dev logs" ON public.desenvolvimento_log;
CREATE POLICY "Staff can update dev logs" ON public.desenvolvimento_log
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can delete dev logs" ON public.desenvolvimento_log;
CREATE POLICY "Staff can delete dev logs" ON public.desenvolvimento_log
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update all expenses" ON public.despesas;
CREATE POLICY "Staff can update expenses" ON public.despesas
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can delete all expenses" ON public.despesas;
CREATE POLICY "Staff can delete expenses" ON public.despesas
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create status history" ON public.mae_status_history;
CREATE POLICY "Staff can create status history" ON public.mae_status_history
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.playbook_categorias;
CREATE POLICY "Staff can insert categories" ON public.playbook_categorias
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.playbook_categorias;
CREATE POLICY "Staff can update categories" ON public.playbook_categorias
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.playbook_categorias;
CREATE POLICY "Staff can delete categories" ON public.playbook_categorias
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update entries" ON public.playbook_entradas;
CREATE POLICY "Staff can update entries" ON public.playbook_entradas
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can delete entries" ON public.playbook_entradas;
CREATE POLICY "Staff can delete entries" ON public.playbook_entradas
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create content types" ON public.tipos_conteudo;
CREATE POLICY "Staff can create content types" ON public.tipos_conteudo
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can update content types" ON public.tipos_conteudo;
CREATE POLICY "Staff can update content types" ON public.tipos_conteudo
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can delete content types" ON public.tipos_conteudo;
CREATE POLICY "Staff can delete content types" ON public.tipos_conteudo
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
