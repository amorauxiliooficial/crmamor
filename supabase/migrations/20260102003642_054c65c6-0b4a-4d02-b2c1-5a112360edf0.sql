-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create playbook categories table
CREATE TABLE public.playbook_categorias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL UNIQUE,
    descricao text,
    ordem integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.playbook_categorias ENABLE ROW LEVEL SECURITY;

-- Create playbook entries table
CREATE TABLE public.playbook_entradas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id uuid REFERENCES public.playbook_categorias(id) ON DELETE SET NULL,
    pergunta text NOT NULL,
    resposta text NOT NULL,
    tags text[],
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.playbook_entradas ENABLE ROW LEVEL SECURITY;

-- Create favorites table
CREATE TABLE public.playbook_favoritos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    entrada_id uuid REFERENCES public.playbook_entradas(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, entrada_id)
);

ALTER TABLE public.playbook_favoritos ENABLE ROW LEVEL SECURITY;

-- RLS policies for playbook_categorias
CREATE POLICY "Anyone authenticated can view categories"
ON public.playbook_categorias
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.playbook_categorias
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for playbook_entradas
CREATE POLICY "Anyone authenticated can view entries"
ON public.playbook_entradas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage entries"
ON public.playbook_entradas
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for playbook_favoritos
CREATE POLICY "Users can view their own favorites"
ON public.playbook_favoritos
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own favorites"
ON public.playbook_favoritos
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Update triggers
CREATE TRIGGER update_playbook_categorias_updated_at
BEFORE UPDATE ON public.playbook_categorias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playbook_entradas_updated_at
BEFORE UPDATE ON public.playbook_entradas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial categories
INSERT INTO public.playbook_categorias (nome, descricao, ordem) VALUES
('Objeções de Preço', 'Respostas para dúvidas sobre valores e custos', 1),
('Documentação', 'Dúvidas sobre documentos necessários', 2),
('Processo INSS', 'Perguntas sobre como funciona o processo', 3),
('Prazos', 'Dúvidas sobre tempo de resposta e prazos', 4),
('Pagamento', 'Questões sobre formas de pagamento', 5);