
-- Add published version support to ai_agents
ALTER TABLE public.ai_agents 
  ADD COLUMN IF NOT EXISTS published_config jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Add idempotency tracking: last processed trigger message per conversation
ALTER TABLE public.wa_conversations 
  ADD COLUMN IF NOT EXISTS last_ai_trigger_msg_id uuid DEFAULT NULL;
