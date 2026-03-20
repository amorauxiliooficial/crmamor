ALTER TABLE wa_messages DROP CONSTRAINT IF EXISTS wa_messages_status_check;
ALTER TABLE wa_messages ADD CONSTRAINT wa_messages_status_check 
  CHECK (status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text, 'failed'::text, 'pending'::text, 'received'::text]));