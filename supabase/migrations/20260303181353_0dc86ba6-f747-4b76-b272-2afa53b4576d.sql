
-- Remove the overly permissive policy (webhooks use service role key, bypass RLS)
DROP POLICY IF EXISTS "Service can update message status" ON public.wa_messages;
