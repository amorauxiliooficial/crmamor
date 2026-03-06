
-- Create ai_agents table
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  tone text NOT NULL DEFAULT 'amigável e profissional',
  max_tokens integer NOT NULL DEFAULT 300,
  departments text[] DEFAULT '{}',
  system_prompt text DEFAULT '',
  knowledge_instructions text DEFAULT '',
  knowledge_faq jsonb DEFAULT '[]',
  knowledge_links text[] DEFAULT '{}',
  tools_config jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- RLS policies: only admins can manage, authenticated can view active
CREATE POLICY "Admins can manage agents" ON public.ai_agents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view active agents" ON public.ai_agents FOR SELECT TO authenticated
  USING (true);

-- Add ai_agent_id and ai_enabled columns to wa_conversations
ALTER TABLE public.wa_conversations
  ADD COLUMN ai_agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  ADD COLUMN ai_enabled boolean NOT NULL DEFAULT false;
