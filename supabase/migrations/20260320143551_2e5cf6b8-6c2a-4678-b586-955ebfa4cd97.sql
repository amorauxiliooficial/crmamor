ALTER TABLE public.wa_messages DROP CONSTRAINT IF EXISTS wa_messages_instance_id_fkey;
ALTER TABLE public.wa_messages
  ADD CONSTRAINT wa_messages_instance_id_fkey
  FOREIGN KEY (instance_id)
  REFERENCES public.whatsapp_instances(id)
  ON DELETE SET NULL;

ALTER TABLE public.wa_conversations DROP CONSTRAINT IF EXISTS wa_conversations_instance_id_fkey;
ALTER TABLE public.wa_conversations
  ADD CONSTRAINT wa_conversations_instance_id_fkey
  FOREIGN KEY (instance_id)
  REFERENCES public.whatsapp_instances(id)
  ON DELETE SET NULL;

ALTER TABLE public.conversation_transfers DROP CONSTRAINT IF EXISTS conversation_transfers_from_instance_id_fkey;
ALTER TABLE public.conversation_transfers
  ADD CONSTRAINT conversation_transfers_from_instance_id_fkey
  FOREIGN KEY (from_instance_id)
  REFERENCES public.whatsapp_instances(id)
  ON DELETE SET NULL;

ALTER TABLE public.conversation_transfers DROP CONSTRAINT IF EXISTS conversation_transfers_to_instance_id_fkey;
ALTER TABLE public.conversation_transfers
  ADD CONSTRAINT conversation_transfers_to_instance_id_fkey
  FOREIGN KEY (to_instance_id)
  REFERENCES public.whatsapp_instances(id)
  ON DELETE SET NULL;