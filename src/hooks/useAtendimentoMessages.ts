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

  const handleSend = useCallback(() => {
    if (!conversationId || !msgText.trim() || !selectedWa) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    const text = msgText.trim();

    sendWhatsApp.mutate(
      { to: selectedWa.wa_phone, text, conversation_id: conversationId },
      {
        onSuccess: () => {
          sendingRef.current = false;
        },
        onError: (err: any) => {
          sendingRef.current = false;
          console.error("Send error:", err);
          const msg = err?.message || "Tente novamente.";
          let description = msg;
          if (msg.includes("Sem sessão ativa")) {
            description = "Sessão inválida. Faça login novamente.";
          } else if (msg.includes("missing Meta credentials") || msg.includes("META_WA_TOKEN")) {
            description = "Configure META_WA_TOKEN e META_PHONE_NUMBER_ID em Cloud → Secrets.";
          } else if (msg.includes("Evolution API not configured") || msg.includes("EVOLUTION_API")) {
            description = "Configure EVOLUTION_API_URL e EVOLUTION_API_KEY em Cloud → Secrets.";
          } else if (msg.includes("Unauthorized") || msg.includes("status=401")) {
            description = "Sessão expirada ou inválida. Faça login novamente.";
          }
          toast({ title: "Erro ao enviar", description, variant: "destructive" });
        },
      }
    );
    setMsgText("");
  }, [conversationId, msgText, selectedWa, sendWhatsApp, toast]);

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
            toast({ title: "Erro ao enviar mídia", description: err?.message || "Tente novamente.", variant: "destructive" });
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
          toast({ title: "Falha ao reenviar", description: err?.message || "Tente novamente.", variant: "destructive" });
        },
      }
    );
  }, [conversationId, selectedWa, retryWhatsApp, toast]);

  return { msgText, setMsgText, handleSend, handleSendMedia, handleRetry };
}
