CREATE TABLE public.atendentes_comunicado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cargo text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendentes_comunicado TO authenticated;
GRANT ALL ON public.atendentes_comunicado TO service_role;

ALTER TABLE public.atendentes_comunicado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view atendentes"
  ON public.atendentes_comunicado FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert atendentes"
  ON public.atendentes_comunicado FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update atendentes"
  ON public.atendentes_comunicado FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete atendentes"
  ON public.atendentes_comunicado FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_atendentes_comunicado_updated_at
  BEFORE UPDATE ON public.atendentes_comunicado
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();