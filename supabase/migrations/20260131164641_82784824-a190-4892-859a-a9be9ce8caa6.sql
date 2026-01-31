-- Create enum for task priority
CREATE TYPE public.task_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Create enum for task category
CREATE TYPE public.task_category AS ENUM ('bug', 'melhoria', 'nova_funcionalidade', 'ajuste');

-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('backlog', 'priorizado', 'em_progresso', 'concluido');

-- Create internal tasks table for admin kanban
CREATE TABLE public.tarefas_internas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status task_status NOT NULL DEFAULT 'backlog',
  prioridade task_priority NOT NULL DEFAULT 'media',
  categoria task_category NOT NULL DEFAULT 'melhoria',
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prazo DATE,
  ordem INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tarefas_internas ENABLE ROW LEVEL SECURITY;

-- Only admins can view tasks
CREATE POLICY "Admins can view all tasks"
ON public.tarefas_internas
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can create tasks
CREATE POLICY "Admins can create tasks"
ON public.tarefas_internas
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update tasks
CREATE POLICY "Admins can update tasks"
ON public.tarefas_internas
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete tasks
CREATE POLICY "Admins can delete tasks"
ON public.tarefas_internas
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_tarefas_internas_updated_at
BEFORE UPDATE ON public.tarefas_internas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();