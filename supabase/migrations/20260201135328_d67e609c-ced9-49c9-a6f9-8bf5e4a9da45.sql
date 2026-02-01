-- Add image URL column to tarefas_internas
ALTER TABLE public.tarefas_internas 
ADD COLUMN IF NOT EXISTS imagem_url text NULL;

-- Create storage bucket for task images
INSERT INTO storage.buckets (id, name, public)
VALUES ('tarefas-imagens', 'tarefas-imagens', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Admins can upload task images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tarefas-imagens' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to view images
CREATE POLICY "Anyone can view task images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tarefas-imagens');

-- Allow admins to delete images
CREATE POLICY "Admins can delete task images"
ON storage.objects FOR DELETE
USING (bucket_id = 'tarefas-imagens' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update images
CREATE POLICY "Admins can update task images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tarefas-imagens' AND has_role(auth.uid(), 'admin'::app_role));