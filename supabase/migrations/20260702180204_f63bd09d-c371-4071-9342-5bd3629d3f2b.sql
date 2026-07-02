CREATE TABLE public.etiquetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etiquetas TO authenticated;
GRANT ALL ON public.etiquetas TO service_role;
ALTER TABLE public.etiquetas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view etiquetas" ON public.etiquetas FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert etiquetas" ON public.etiquetas FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update etiquetas" ON public.etiquetas FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete etiquetas" ON public.etiquetas FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

INSERT INTO public.etiquetas (nome, cor) VALUES
  ('marketing', '#ec4899'),
  ('instagram', '#a855f7'),
  ('indicacao', '#22c55e'),
  ('parceiro', '#3b82f6')
ON CONFLICT (nome) DO NOTHING;