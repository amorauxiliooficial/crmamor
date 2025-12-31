-- Drop existing restrictive policies on mae_processo
DROP POLICY IF EXISTS "Users can view their own processes" ON public.mae_processo;
DROP POLICY IF EXISTS "Users can update their own processes" ON public.mae_processo;
DROP POLICY IF EXISTS "Users can delete their own processes" ON public.mae_processo;
DROP POLICY IF EXISTS "Authenticated users can create processes" ON public.mae_processo;

-- Create new policies allowing all authenticated users full access
CREATE POLICY "Authenticated users can view all processes" 
ON public.mae_processo 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create processes" 
ON public.mae_processo 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all processes" 
ON public.mae_processo 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all processes" 
ON public.mae_processo 
FOR DELETE 
TO authenticated
USING (true);

-- Update checklist_mae policies
DROP POLICY IF EXISTS "Users can view their own checklists" ON public.checklist_mae;
DROP POLICY IF EXISTS "Users can create checklists for their own processes" ON public.checklist_mae;
DROP POLICY IF EXISTS "Users can update their own checklists" ON public.checklist_mae;
DROP POLICY IF EXISTS "Users can delete their own checklists" ON public.checklist_mae;

CREATE POLICY "Authenticated users can view all checklists" 
ON public.checklist_mae 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create checklists" 
ON public.checklist_mae 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update all checklists" 
ON public.checklist_mae 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all checklists" 
ON public.checklist_mae 
FOR DELETE 
TO authenticated
USING (true);

-- Update decisao_processo policies
DROP POLICY IF EXISTS "Users can view their own decisions" ON public.decisao_processo;
DROP POLICY IF EXISTS "Users can create decisions for their own processes" ON public.decisao_processo;
DROP POLICY IF EXISTS "Users can update their own decisions" ON public.decisao_processo;
DROP POLICY IF EXISTS "Users can delete their own decisions" ON public.decisao_processo;

CREATE POLICY "Authenticated users can view all decisions" 
ON public.decisao_processo 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create decisions" 
ON public.decisao_processo 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update all decisions" 
ON public.decisao_processo 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all decisions" 
ON public.decisao_processo 
FOR DELETE 
TO authenticated
USING (true);

-- Update conferencia_inss policies
DROP POLICY IF EXISTS "Users can view their own checks" ON public.conferencia_inss;
DROP POLICY IF EXISTS "Authenticated users can create checks" ON public.conferencia_inss;
DROP POLICY IF EXISTS "Authenticated users can update their own checks" ON public.conferencia_inss;
DROP POLICY IF EXISTS "Authenticated users can delete their own checks" ON public.conferencia_inss;

CREATE POLICY "Authenticated users can view all checks" 
ON public.conferencia_inss 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create checks" 
ON public.conferencia_inss 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all checks" 
ON public.conferencia_inss 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all checks" 
ON public.conferencia_inss 
FOR DELETE 
TO authenticated
USING (true);