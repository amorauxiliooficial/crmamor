
ALTER TABLE public.wa_conversations
ADD COLUMN channel text NOT NULL DEFAULT 'official';
