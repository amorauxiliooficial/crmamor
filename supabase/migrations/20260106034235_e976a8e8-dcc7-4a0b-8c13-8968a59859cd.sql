-- Add tempo_estimado column to onboarding_items (in minutes)
ALTER TABLE public.onboarding_items 
ADD COLUMN tempo_estimado integer DEFAULT 5;