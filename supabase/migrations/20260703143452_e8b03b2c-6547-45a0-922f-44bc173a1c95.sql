
CREATE TABLE public.parcelas_recebimento_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  central_id uuid NOT NULL REFERENCES public.central_financeira(id) ON DELETE CASCADE,
  mae_id uuid NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  numero_parcela integer NOT NULL,
  valor numeric,
  data_prevista date,
  status text NOT NULL DEFAULT 'prevista',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas_recebimento_cliente TO authenticated;
GRANT ALL ON public.parcelas_recebimento_cliente TO service_role;

ALTER TABLE public.parcelas_recebimento_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view parcelas recebimento"
  ON public.parcelas_recebimento_cliente FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert parcelas recebimento"
  ON public.parcelas_recebimento_cliente FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update parcelas recebimento"
  ON public.parcelas_recebimento_cliente FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete parcelas recebimento"
  ON public.parcelas_recebimento_cliente FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER set_updated_at_parcelas_recebimento
  BEFORE UPDATE ON public.parcelas_recebimento_cliente
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
