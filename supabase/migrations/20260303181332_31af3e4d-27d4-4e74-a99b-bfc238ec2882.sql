
-- Add edit tracking columns to wa_messages
ALTER TABLE public.wa_messages 
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS edited_by_agent_id uuid DEFAULT NULL;

-- Drop existing permissive UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update messages" ON public.wa_messages;

-- New UPDATE policy: only outbound messages by the sender, within 5 minutes
CREATE POLICY "Agents can edit own outbound messages within 5 min"
ON public.wa_messages
FOR UPDATE
USING (
  direction = 'out'
  AND sent_by = auth.uid()
  AND created_at > now() - interval '5 minutes'
)
WITH CHECK (
  direction = 'out'
  AND sent_by = auth.uid()
);

-- Also allow webhook/service to update status (sent_by IS NULL for inbound, or status updates)
CREATE POLICY "Service can update message status"
ON public.wa_messages
FOR UPDATE
USING (true)
WITH CHECK (true);
