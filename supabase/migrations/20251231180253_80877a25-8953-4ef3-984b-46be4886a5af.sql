-- Fix PUBLIC_DATA_EXPOSURE: Restore owner-only access for mae_processo table

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view all processes" ON public.mae_processo;
DROP POLICY IF EXISTS "Authenticated users can update all processes" ON public.mae_processo;
DROP POLICY IF EXISTS "Authenticated users can delete all processes" ON public.mae_processo;

-- Restore owner-only access
CREATE POLICY "Users can view their own processes" 
ON public.mae_processo FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own processes" 
ON public.mae_processo FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processes" 
ON public.mae_processo FOR DELETE 
USING (auth.uid() = user_id);