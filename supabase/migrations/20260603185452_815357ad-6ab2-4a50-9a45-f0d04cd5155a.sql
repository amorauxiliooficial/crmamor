ALTER TABLE public.mae_processo
  ADD COLUMN IF NOT EXISTS referral_id uuid REFERENCES public.indicacoes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mae_processo_referral_id
  ON public.mae_processo(referral_id)
  WHERE referral_id IS NOT NULL;