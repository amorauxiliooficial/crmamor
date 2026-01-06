-- Add login and password fields for system access type
ALTER TABLE public.onboarding_items 
ADD COLUMN login_sistema TEXT,
ADD COLUMN senha_sistema TEXT;