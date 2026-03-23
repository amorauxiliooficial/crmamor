import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
import type { WaConversation } from "@/hooks/useWhatsApp";

interface UseAtendimentoMessagesParams {
  conversationId: string | null;
  selectedWa: WaConversation | undefined | null;
  sendWhatsApp: { mutate: Function; isPending: boolean };
  retryWhatsApp: { mutate: Function };
  toast: (opts: any) => void;
  queryClient: QueryClient;
  userId: string | null;
}

export function useAtendimentoMessages({
  conversationId,
  selectedWa,
  sendWhatsApp,
  retryWhatsApp,
  toast,
  queryClient,
  userId,
}: UseAtendimentoMessagesParams) {
  const [msgText, setMsgText] = useState("");
  const sendingRef = useRef(false);
  const lastMsgRef = useRef("");

  const handleSend = useCallback(() => {
    if (!conversationId || !msgText.trim() || !selectedWa) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    const text = msgText.trim();
    lastMsgRef.current = text;

    const optimisticMsg = {
      id: "temp-" + Date.now(),
      conversation_id: conversationId,
      meta_message_id: null,
      direction: "out",
      body: text,
      msg_type: "text",
      status: "sending",
      sent_by: userId ?? null,
      created_at: new Date().toISOString(),
      media_url: null,
      media_mime: null,
      media_filename: null,
      media_size: null,
      media_duration: null,
      meta_media_id: null,
    };

    queryClient.setQueryData(["wa_messages", conversationId], (old: any[]) => [
      ...(old || []),
      optimisticMsg,
    ]);

    sendWhatsApp.mutate(
      { to: selectedWa.wa_phone, text, conversation_id: conversationId },
      {
        onSuccess: () => {
          sendingRef.current = false;
        },
        onError: (err: any) => {
          sendingRef.current = false;
          console.error("Send error:", err);
          queryClient.setQueryData(["wa_messages", conversationId], (old: any[]) =>
            old
              ? old.map((m: any) =>
                  m.id === optimisticMsg.id ? { ...m, status: "failed" } : m
                )
              : old
          );
          setMsgText(lastMsgRef.current);
          toast({ title: "Erro ao enviar", description: "Tente novamente.", variant: "destructive" });
        },
      }
    );
    setMsgText("");
  }, [conversationId, msgText, selectedWa, sendWhatsApp, toast, userId, queryClient]);

  const handleSendMedia = useCallback(async (file: File) => {
    if (!conversationId || !selectedWa) return;

    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `outbound/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('wa-media')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('wa-media').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      let msgType = 'document';
      if (file.type.startsWith('image/')) msgType = 'image';
      else if (file.type.startsWith('video/')) msgType = 'video';
      else if (file.type.startsWith('audio/')) msgType = 'audio';

      sendWhatsApp.mutate(
        {
          to: selectedWa.wa_phone,
          conversation_id: conversationId,
          type: msgType,
          media_url: publicUrl,
          media_mime: file.type,
          media_filename: file.name,
          caption: msgText.trim() || undefined,
        },
        {
          onError: (err: any) => {
            console.error("Send media error:", err);
            toast({ title: "Erro ao enviar mídia", description: "Tente novamente.", variant: "destructive" });
          },
        }
      );
      setMsgText("");
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Erro ao fazer upload", description: "Tente novamente.", variant: "destructive" });
    }
  }, [conversationId, selectedWa, sendWhatsApp, msgText, toast]);

  const handleRetry = useCallback((messageId: string, body: string, msgType?: string, mediaUrl?: string, mediaMime?: string, mediaFilename?: string) => {
    if (!conversationId || !selectedWa) return;
    retryWhatsApp.mutate(
      {
        messageId,
        to: selectedWa.wa_phone,
        text: msgType === 'text' || !msgType ? body : undefined,
        conversation_id: conversationId,
        type: msgType,
        media_url: mediaUrl,
        media_mime: mediaMime,
        media_filename: mediaFilename,
      },
      {
        onSuccess: () => toast({ title: "Mensagem reenviada ✅" }),
        onError: (err: any) => {
          console.error("Retry error:", err);
          toast({ title: "Falha ao reenviar", description: "Tente novamente.", variant: "destructive" });
        },
      }
    );
  }, [conversationId, selectedWa, retryWhatsApp, toast]);

  return { msgText, setMsgText, handleSend, handleSendMedia, handleRetry };
}
