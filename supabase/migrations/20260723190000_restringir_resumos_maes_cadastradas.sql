-- A integração de resumos só pode armazenar mensagens de mães já cadastradas
-- e com contrato assinado no sistema Amor.
DELETE FROM public.zap_conversation_messages
WHERE mae_id IS NULL;

ALTER TABLE public.zap_conversation_messages
  ALTER COLUMN mae_id SET NOT NULL;

ALTER TABLE public.zap_conversation_messages
  DROP CONSTRAINT IF EXISTS zap_conversation_messages_mae_id_fkey;

ALTER TABLE public.zap_conversation_messages
  ADD CONSTRAINT zap_conversation_messages_mae_id_fkey
  FOREIGN KEY (mae_id)
  REFERENCES public.mae_processo(id)
  ON DELETE CASCADE;
