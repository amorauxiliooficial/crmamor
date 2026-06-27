
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user'::app_role)
  ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$;

DROP POLICY IF EXISTS "Authenticated users can view all processes" ON public.mae_processo;
CREATE POLICY "Staff can view all processes" ON public.mae_processo
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "auth select central_financeira" ON public.central_financeira;
CREATE POLICY "Staff can view central_financeira" ON public.central_financeira
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "fornecedores_select" ON public.fornecedores;
CREATE POLICY "fornecedores_select" ON public.fornecedores
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "indicacoes_select" ON public.indicacoes;
CREATE POLICY "indicacoes_select" ON public.indicacoes
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "lead_intake_select" ON public.lead_intake;
CREATE POLICY "lead_intake_select" ON public.lead_intake
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "mother_contacts_select" ON public.mother_contacts;
CREATE POLICY "mother_contacts_select" ON public.mother_contacts
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "pre_analise_select" ON public.pre_analise;
CREATE POLICY "pre_analise_select" ON public.pre_analise
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view all prospeccao" ON public.prospeccao;
CREATE POLICY "Staff can view prospeccao" ON public.prospeccao
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "wa_conv_select" ON public.wa_conversations;
CREATE POLICY "wa_conv_select" ON public.wa_conversations
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "wa_msg_select" ON public.wa_messages;
CREATE POLICY "wa_msg_select" ON public.wa_messages
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view active agents" ON public.ai_agents;
CREATE POLICY "Admins can view agents" ON public.ai_agents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Staff can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update all prospeccao" ON public.prospeccao;
CREATE POLICY "Staff can update prospeccao" ON public.prospeccao
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete all prospeccao" ON public.prospeccao;
CREATE POLICY "Staff can delete prospeccao" ON public.prospeccao
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "auth_realtime_messages" ON realtime.messages;
CREATE POLICY "staff_realtime_messages" ON realtime.messages
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.owns_mae_processo(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_migrations_in_period(text, text) FROM anon, authenticated, PUBLIC;

DROP POLICY IF EXISTS "documentos_preanalise_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "documentos_preanalise_select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documentos-preanalise" ON storage.objects;
DROP POLICY IF EXISTS "Public read documentos-preanalise" ON storage.objects;

CREATE POLICY "documentos_preanalise_staff_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-preanalise' AND public.is_staff(auth.uid()));

CREATE POLICY "documentos_preanalise_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-preanalise' AND public.is_staff(auth.uid()));

CREATE POLICY "documentos_preanalise_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos-preanalise' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'documentos-preanalise' AND public.is_staff(auth.uid()));

CREATE POLICY "documentos_preanalise_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos-preanalise' AND public.is_staff(auth.uid()));
