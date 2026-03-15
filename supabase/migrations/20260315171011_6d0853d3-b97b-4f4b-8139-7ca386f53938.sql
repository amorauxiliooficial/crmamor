
CREATE TABLE public.desenvolvimento_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'melhoria',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  tarefa_roadmap_id uuid REFERENCES public.tarefas_internas(id) ON DELETE SET NULL
);

ALTER TABLE public.desenvolvimento_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dev logs"
  ON public.desenvolvimento_log FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create dev logs"
  ON public.desenvolvimento_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update dev logs"
  ON public.desenvolvimento_log FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete dev logs"
  ON public.desenvolvimento_log FOR DELETE TO authenticated
  USING (true);
