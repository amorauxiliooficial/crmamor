-- Remover políticas antigas de mae_processo
DROP POLICY IF EXISTS "Users can view their own processes" ON public.mae_processo;
DROP POLICY IF EXISTS "Users can create their own processes" ON public.mae_processo;
DROP POLICY IF EXISTS "Users can update their own processes" ON public.mae_processo;
DROP POLICY IF EXISTS "Users can delete their own processes" ON public.mae_processo;

-- Criar novas políticas para mae_processo (todos usuários autenticados veem tudo)
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

-- Remover políticas antigas de checklist_mae
DROP POLICY IF EXISTS "Users can view checklists of their processes" ON public.checklist_mae;
DROP POLICY IF EXISTS "Users can create checklists for their processes" ON public.checklist_mae;
DROP POLICY IF EXISTS "Users can update checklists of their processes" ON public.checklist_mae;
DROP POLICY IF EXISTS "Users can delete checklists of their processes" ON public.checklist_mae;

-- Criar novas políticas para checklist_mae
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

-- Remover políticas antigas de decisao_processo
DROP POLICY IF EXISTS "Users can view decisions of their processes" ON public.decisao_processo;
DROP POLICY IF EXISTS "Users can create decisions for their processes" ON public.decisao_processo;
DROP POLICY IF EXISTS "Users can update decisions of their processes" ON public.decisao_processo;
DROP POLICY IF EXISTS "Users can delete decisions of their processes" ON public.decisao_processo;

-- Criar novas políticas para decisao_processo
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