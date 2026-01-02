-- Drop existing admin-only policies for playbook_entradas
DROP POLICY IF EXISTS "Admins can manage entries" ON public.playbook_entradas;

-- Create new policies allowing all authenticated users
CREATE POLICY "Authenticated users can insert entries"
ON public.playbook_entradas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update entries"
ON public.playbook_entradas
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete entries"
ON public.playbook_entradas
FOR DELETE
TO authenticated
USING (true);

-- Also update playbook_categorias to allow all users to manage
DROP POLICY IF EXISTS "Admins can manage categories" ON public.playbook_categorias;

CREATE POLICY "Authenticated users can insert categories"
ON public.playbook_categorias
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
ON public.playbook_categorias
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete categories"
ON public.playbook_categorias
FOR DELETE
TO authenticated
USING (true);