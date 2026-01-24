-- Criar bucket para documentos de pré-análise
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-preanalise', 'documentos-preanalise', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos-preanalise');

CREATE POLICY "Authenticated users can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documentos-preanalise');

CREATE POLICY "Authenticated users can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documentos-preanalise');