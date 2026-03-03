
DROP POLICY IF EXISTS "Agents can edit own outbound messages within 5 min" ON public.wa_messages;

CREATE POLICY "Agents can edit own outbound messages within 15 min"
ON public.wa_messages
FOR UPDATE
TO authenticated
USING (
  direction = 'out'
  AND sent_by = auth.uid()
  AND created_at > now() - interval '15 minutes'
)
WITH CHECK (
  direction = 'out'
  AND sent_by = auth.uid()
);
