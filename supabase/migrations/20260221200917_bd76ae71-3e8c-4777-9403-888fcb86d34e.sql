
-- Allow authenticated users to delete messages (needed for retry of failed messages)
CREATE POLICY "Authenticated users can delete messages"
ON public.wa_messages
FOR DELETE
USING (true);
