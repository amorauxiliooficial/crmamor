
-- WhatsApp conversations table
CREATE TABLE public.wa_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mae_id UUID REFERENCES public.mae_processo(id),
  wa_phone TEXT NOT NULL,
  wa_name TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  assigned_to UUID,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_preview TEXT,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for phone lookup
CREATE UNIQUE INDEX idx_wa_conversations_phone ON public.wa_conversations(wa_phone);

-- WhatsApp messages table
CREATE TABLE public.wa_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  meta_message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  body TEXT,
  msg_type TEXT NOT NULL DEFAULT 'text',
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'pending')),
  sent_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dedup index
CREATE UNIQUE INDEX idx_wa_messages_meta_id ON public.wa_messages(meta_message_id) WHERE meta_message_id IS NOT NULL;

-- Index for conversation messages
CREATE INDEX idx_wa_messages_conversation ON public.wa_messages(conversation_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for wa_conversations
CREATE POLICY "Authenticated users can view all conversations"
  ON public.wa_conversations FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert conversations"
  ON public.wa_conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update conversations"
  ON public.wa_conversations FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete conversations"
  ON public.wa_conversations FOR DELETE USING (true);

-- RLS policies for wa_messages
CREATE POLICY "Authenticated users can view all messages"
  ON public.wa_messages FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON public.wa_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update messages"
  ON public.wa_messages FOR UPDATE USING (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_messages;

-- Updated_at trigger for conversations
CREATE TRIGGER update_wa_conversations_updated_at
  BEFORE UPDATE ON public.wa_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
