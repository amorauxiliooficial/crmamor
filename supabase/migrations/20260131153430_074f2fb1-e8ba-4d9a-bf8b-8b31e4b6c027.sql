-- Create table for admin alerts/comments to attendants
CREATE TABLE public.alertas_mae (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mae_id uuid NOT NULL REFERENCES public.mae_processo(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  destinatario_id uuid, -- NULL means for all attendants of this mae
  mensagem text NOT NULL,
  lido boolean DEFAULT false,
  lido_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alertas_mae ENABLE ROW LEVEL SECURITY;

-- Admins can create alerts
CREATE POLICY "Admins can create alerts"
ON public.alertas_mae
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all alerts
CREATE POLICY "Admins can manage all alerts"
ON public.alertas_mae
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view alerts destined to them or to all
CREATE POLICY "Users can view their alerts"
ON public.alertas_mae
FOR SELECT
USING (
  destinatario_id = auth.uid() 
  OR destinatario_id IS NULL 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can mark their alerts as read
CREATE POLICY "Users can mark alerts as read"
ON public.alertas_mae
FOR UPDATE
USING (destinatario_id = auth.uid() OR destinatario_id IS NULL)
WITH CHECK (destinatario_id = auth.uid() OR destinatario_id IS NULL);

-- Add index for performance
CREATE INDEX idx_alertas_mae_mae_id ON public.alertas_mae(mae_id);
CREATE INDEX idx_alertas_mae_destinatario ON public.alertas_mae(destinatario_id);