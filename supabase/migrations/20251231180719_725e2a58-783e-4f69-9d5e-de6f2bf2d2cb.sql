-- Fix RLS policies for related tables to ensure ownership validation

-- 1. Create a security definer function to check mae ownership
CREATE OR REPLACE FUNCTION public.owns_mae_processo(_mae_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mae_processo
    WHERE id = _mae_id
      AND user_id = auth.uid()
  )
$$;

-- 2. Fix checklist_mae policies
DROP POLICY IF EXISTS "Authenticated users can view all checklists" ON public.checklist_mae;
DROP POLICY IF EXISTS "Authenticated users can create checklists" ON public.checklist_mae;
DROP POLICY IF EXISTS "Authenticated users can update all checklists" ON public.checklist_mae;
DROP POLICY IF EXISTS "Authenticated users can delete all checklists" ON public.checklist_mae;

CREATE POLICY "Users can view their own checklists" 
ON public.checklist_mae FOR SELECT 
USING (public.owns_mae_processo(mae_id));

CREATE POLICY "Users can create checklists for their own processes" 
ON public.checklist_mae FOR INSERT 
WITH CHECK (public.owns_mae_processo(mae_id));

CREATE POLICY "Users can update their own checklists" 
ON public.checklist_mae FOR UPDATE 
USING (public.owns_mae_processo(mae_id));

CREATE POLICY "Users can delete their own checklists" 
ON public.checklist_mae FOR DELETE 
USING (public.owns_mae_processo(mae_id));

-- 3. Fix decisao_processo policies
DROP POLICY IF EXISTS "Authenticated users can view all decisions" ON public.decisao_processo;
DROP POLICY IF EXISTS "Authenticated users can create decisions" ON public.decisao_processo;
DROP POLICY IF EXISTS "Authenticated users can update all decisions" ON public.decisao_processo;
DROP POLICY IF EXISTS "Authenticated users can delete all decisions" ON public.decisao_processo;

CREATE POLICY "Users can view their own decisions" 
ON public.decisao_processo FOR SELECT 
USING (public.owns_mae_processo(mae_id));

CREATE POLICY "Users can create decisions for their own processes" 
ON public.decisao_processo FOR INSERT 
WITH CHECK (public.owns_mae_processo(mae_id));

CREATE POLICY "Users can update their own decisions" 
ON public.decisao_processo FOR UPDATE 
USING (public.owns_mae_processo(mae_id));

CREATE POLICY "Users can delete their own decisions" 
ON public.decisao_processo FOR DELETE 
USING (public.owns_mae_processo(mae_id));

-- 4. Fix conferencia_inss SELECT policy (INSERT/UPDATE/DELETE already correct)
DROP POLICY IF EXISTS "Authenticated users can view all checks" ON public.conferencia_inss;

CREATE POLICY "Users can view their own checks" 
ON public.conferencia_inss FOR SELECT 
USING (auth.uid() = user_id);