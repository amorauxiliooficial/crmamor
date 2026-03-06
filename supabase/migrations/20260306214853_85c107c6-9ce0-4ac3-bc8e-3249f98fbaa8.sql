
-- Billing events table to track actual costs from Meta webhook pricing data
CREATE TABLE public.wa_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.wa_messages(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE CASCADE NOT NULL,
  meta_message_id text,
  billable boolean NOT NULL DEFAULT true,
  pricing_model text,
  category text,
  estimated_cost numeric(10,6) DEFAULT 0,
  currency text DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view billing events"
  ON public.wa_billing_events FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service can insert billing events"
  ON public.wa_billing_events FOR INSERT TO authenticated
  WITH CHECK (true);

-- Rate cards table for cost estimation
CREATE TABLE public.wa_rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market text NOT NULL DEFAULT 'brazil',
  category text NOT NULL,
  direction text NOT NULL DEFAULT 'business_initiated',
  cost_per_message numeric(10,6) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(market, category, direction, effective_from)
);

ALTER TABLE public.wa_rate_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rate cards"
  ON public.wa_rate_cards FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage rate cards"
  ON public.wa_rate_cards FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Billing settings table
CREATE TABLE public.wa_billing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_limit numeric(10,2) DEFAULT 50,
  monthly_limit numeric(10,2) DEFAULT 500,
  alert_enabled boolean DEFAULT true,
  confirmation_threshold numeric(10,6) DEFAULT 0.10,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_billing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view billing settings"
  ON public.wa_billing_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage billing settings"
  ON public.wa_billing_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default Brazilian rate cards (Meta pricing as of 2025)
INSERT INTO public.wa_rate_cards (market, category, direction, cost_per_message) VALUES
  ('brazil', 'marketing', 'business_initiated', 0.0625),
  ('brazil', 'utility', 'business_initiated', 0.0080),
  ('brazil', 'authentication', 'business_initiated', 0.0315),
  ('brazil', 'service', 'user_initiated', 0.0300),
  ('brazil', 'service', 'business_initiated', 0.0300);

-- Insert default billing settings
INSERT INTO public.wa_billing_settings (daily_limit, monthly_limit, alert_enabled, confirmation_threshold) VALUES (50, 500, true, 0.10);

-- Index for billing queries
CREATE INDEX idx_wa_billing_events_conversation ON public.wa_billing_events(conversation_id);
CREATE INDEX idx_wa_billing_events_created ON public.wa_billing_events(created_at);

-- Enable realtime for billing events
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_billing_events;
