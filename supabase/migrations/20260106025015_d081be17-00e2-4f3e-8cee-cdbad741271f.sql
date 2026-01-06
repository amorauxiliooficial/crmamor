-- Adicionar campos extras na tabela de itens de onboarding
ALTER TABLE public.onboarding_items 
ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'checklist',
ADD COLUMN IF NOT EXISTS url_video TEXT,
ADD COLUMN IF NOT EXISTS arquivo_url TEXT,
ADD COLUMN IF NOT EXISTS requer_assinatura BOOLEAN NOT NULL DEFAULT false;

-- Criar bucket para arquivos de onboarding (manuais, documentos)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('onboarding-files', 'onboarding-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket
CREATE POLICY "Authenticated users can view onboarding files"
ON storage.objects FOR SELECT
USING (bucket_id = 'onboarding-files');

CREATE POLICY "Admins can upload onboarding files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'onboarding-files' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete onboarding files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'onboarding-files' 
  AND has_role(auth.uid(), 'admin')
);

-- Adicionar campo para assinatura no progresso
ALTER TABLE public.onboarding_progresso
ADD COLUMN IF NOT EXISTS assinado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS documento_assinado_url TEXT;