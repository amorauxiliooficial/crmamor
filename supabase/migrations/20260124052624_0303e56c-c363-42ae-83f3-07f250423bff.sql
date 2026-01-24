-- Allow mae_id to be NULL for standalone analyses
ALTER TABLE public.pre_analise 
ALTER COLUMN mae_id DROP NOT NULL;

-- Add session_id column for standalone analyses identification
ALTER TABLE public.pre_analise 
ADD COLUMN IF NOT EXISTS session_id uuid;

-- Add nome_temporario column for standalone analyses (before mae is created)
ALTER TABLE public.pre_analise 
ADD COLUMN IF NOT EXISTS nome_temporario text;

-- Add index for session_id lookups
CREATE INDEX IF NOT EXISTS idx_pre_analise_session_id ON public.pre_analise(session_id) WHERE session_id IS NOT NULL;