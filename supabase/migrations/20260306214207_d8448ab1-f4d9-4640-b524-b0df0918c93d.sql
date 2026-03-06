
-- Create wa_templates table for WhatsApp approved templates
CREATE TABLE public.wa_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  language_code text NOT NULL DEFAULT 'pt_BR',
  category text NOT NULL DEFAULT 'UTILITY',
  status text NOT NULL DEFAULT 'APPROVED',
  components_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wa_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view templates" ON public.wa_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage templates" ON public.wa_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add template metadata columns to wa_messages
ALTER TABLE public.wa_messages ADD COLUMN IF NOT EXISTS template_name text;
ALTER TABLE public.wa_messages ADD COLUMN IF NOT EXISTS template_variables jsonb;
