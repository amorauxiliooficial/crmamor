ALTER TABLE public.prospeccao
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_prospeccao_assigned_user_id ON public.prospeccao(assigned_user_id);