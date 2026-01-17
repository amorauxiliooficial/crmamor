-- Create table for content types
CREATE TABLE public.tipos_conteudo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#8B5CF6',
  plataforma TEXT NOT NULL DEFAULT 'instagram',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for creative/content posts
CREATE TABLE public.criativos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo_conteudo_id UUID REFERENCES public.tipos_conteudo(id),
  tipo_instagram TEXT NOT NULL DEFAULT 'feed', -- 'feed', 'stories', 'reels'
  data_postagem DATE NOT NULL,
  horario_postagem TIME,
  legenda TEXT,
  arquivo_url TEXT,
  status TEXT NOT NULL DEFAULT 'agendado', -- 'agendado', 'postado', 'cancelado'
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tipos_conteudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criativos ENABLE ROW LEVEL SECURITY;

-- Policies for tipos_conteudo (shared across authenticated users)
CREATE POLICY "Authenticated users can view content types"
  ON public.tipos_conteudo FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create content types"
  ON public.tipos_conteudo FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update content types"
  ON public.tipos_conteudo FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete content types"
  ON public.tipos_conteudo FOR DELETE
  TO authenticated
  USING (true);

-- Policies for criativos (shared across authenticated users)
CREATE POLICY "Authenticated users can view criativos"
  ON public.criativos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create criativos"
  ON public.criativos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update criativos"
  ON public.criativos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete criativos"
  ON public.criativos FOR DELETE
  TO authenticated
  USING (true);

-- Insert default content types for Instagram
INSERT INTO public.tipos_conteudo (nome, cor, plataforma) VALUES
  ('Carrossel educativo', '#8B5CF6', 'instagram'),
  ('Post com legenda', '#10B981', 'instagram'),
  ('Reels Informativo', '#3B82F6', 'instagram'),
  ('Reels Educativo', '#06B6D4', 'instagram'),
  ('Story com enquete', '#F59E0B', 'instagram'),
  ('Story interativo', '#EC4899', 'instagram'),
  ('Reels com CTA', '#EF4444', 'instagram'),
  ('Post com dicas', '#84CC16', 'instagram'),
  ('Story com frase', '#A855F7', 'instagram'),
  ('Caixinha de perguntas', '#14B8A6', 'instagram'),
  ('Post de apresentação', '#6366F1', 'instagram'),
  ('FAQ', '#F97316', 'instagram'),
  ('Depoimento', '#22C55E', 'instagram'),
  ('Lembrete', '#FBBF24', 'instagram'),
  ('Notícias', '#64748B', 'instagram'),
  ('Frase inspiradora', '#D946EF', 'instagram');

-- Create trigger for updated_at
CREATE TRIGGER update_tipos_conteudo_updated_at
  BEFORE UPDATE ON public.tipos_conteudo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_criativos_updated_at
  BEFORE UPDATE ON public.criativos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();