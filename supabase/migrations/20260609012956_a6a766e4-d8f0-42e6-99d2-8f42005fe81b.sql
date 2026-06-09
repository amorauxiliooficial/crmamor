ALTER TABLE public.indicacoes ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone;

-- Backfill: use updated_at for currently assigned ones as best-effort baseline
UPDATE public.indicacoes SET assigned_at = updated_at WHERE assigned_user_id IS NOT NULL AND assigned_at IS NULL;