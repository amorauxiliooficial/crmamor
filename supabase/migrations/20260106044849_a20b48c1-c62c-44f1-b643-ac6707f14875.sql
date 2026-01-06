-- Add URL field for system access type
ALTER TABLE public.onboarding_items 
ADD COLUMN url_sistema TEXT;