-- Create table to store multiple attendants per process (many-to-many relationship)
CREATE TABLE public.mae_atendentes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mae_id uuid NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(mae_id, user_id)
);

-- Enable RLS
ALTER TABLE public.mae_atendentes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view all assignments" 
ON public.mae_atendentes 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage assignments" 
ON public.mae_atendentes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_mae_atendentes_mae_id ON public.mae_atendentes(mae_id);
CREATE INDEX idx_mae_atendentes_user_id ON public.mae_atendentes(user_id);