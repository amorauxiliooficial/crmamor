-- Add timestamp columns for tracking time in each status
ALTER TABLE public.tarefas_internas
ADD COLUMN IF NOT EXISTS backlog_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS priorizado_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS em_progresso_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS concluido_at timestamp with time zone;

-- Create junction table for multiple responsáveis
CREATE TABLE IF NOT EXISTS public.tarefa_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.tarefas_internas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tarefa_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tarefa_responsaveis ENABLE ROW LEVEL SECURITY;

-- RLS policies for tarefa_responsaveis (admin only)
CREATE POLICY "Admins can view all assignments"
ON public.tarefa_responsaveis FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create assignments"
ON public.tarefa_responsaveis FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete assignments"
ON public.tarefa_responsaveis FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Function to update status timestamps
CREATE OR REPLACE FUNCTION public.update_tarefa_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'backlog' THEN NEW.backlog_at = now();
      WHEN 'priorizado' THEN NEW.priorizado_at = now();
      WHEN 'em_progresso' THEN NEW.em_progresso_at = now();
      WHEN 'concluido' THEN NEW.concluido_at = now();
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-update timestamps on status change
DROP TRIGGER IF EXISTS update_tarefa_status_timestamp_trigger ON public.tarefas_internas;
CREATE TRIGGER update_tarefa_status_timestamp_trigger
BEFORE UPDATE ON public.tarefas_internas
FOR EACH ROW
EXECUTE FUNCTION public.update_tarefa_status_timestamp();

-- Set initial backlog_at for existing tasks
UPDATE public.tarefas_internas 
SET backlog_at = created_at 
WHERE backlog_at IS NULL;