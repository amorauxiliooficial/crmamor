import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
import type { WaConversation } from "@/hooks/useWhatsApp";

const LID_BLOCK_MSG = "Contato sem número válido (LID). Aguarde correção do canal.";

function hasValidSendablePhone(raw: string | null | undefined): boolean {
  if (!raw) return false;

  // LID is sendable (handled downstream)
  if (raw.startsWith("lid:") || raw.includes("@lid")) return true;

  // Raw JIDs are NOT phone numbers
  if (raw.startsWith("raw:") || raw.includes("@s.whatsapp.net") || raw.includes("@c.us") || raw.includes("@tampa")) {
    return false;
  }

  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Block sending ONLY when the conversation is a LID-like identifier but not sendable.
 * With current rules, LID is sendable, so this will not block LID anymore.
 * Kept to avoid changing call sites.
 */
function isLidContact(convo: WaConversation | undefined | null): boolean {
  const raw = convo?.wa_phone;
  if (!raw) return false;

  const isLid = raw.startsWith("lid:") || raw.includes("@lid");
  return isLid && !hasValidSendablePhone(raw);
}

function normalizeWhatsAppTo(raw: string): string | null {
  // LID contacts from WhatsApp Web — keep as-is
  if (raw.includes("@lid") || raw.startsWith("lid:")) return raw;

  // Do NOT treat raw JIDs as phone numbers
  if (raw.startsWith("raw:") || raw.includes("@s.whatsapp.net") || raw.includes("@c.us") || raw.includes("@tampa")) {
    return null;
  }

  // Normal phone: strip non-digits, ensure 10+ digits
  const stripped = raw.split("@")[0];
  const digits = stripped.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits;
}

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
    if (!conversationId || !selectedWa) return;

    // Sanitiza texto (remove zero-width) e evita enviar vazio/invisível
    const text = msgText.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
    if (!text) return;

    if (isLidContact(selectedWa)) {
      toast({
        title: "Envio bloqueado",
        description: LID_BLOCK_MSG,
        variant: "destructive",
      });
      return;
    }

    if (sendingRef.current) return;
    sendingRef.current = true;

    const to = normalizeWhatsAppTo(selectedWa.wa_phone);
    if (!to) {
      sendingRef.current = false;
      toast({
        title: "Número inválido",
        description: "O telefone do contato não pode ser identificado. Verifique o cadastro.",
        variant: "destructive",
      });
      return;
    }

    sendWhatsApp.mutate(
      { to, text, type: "text", conversation_id: conversationId },
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

          // Extract status and details for better debugging
          const statusMatch = msg.match(/status=(\d+)/);
          const detailsMatch = msg.match(/details=(.*)/);
          const statusCode = statusMatch ? statusMatch[1] : null;
          const detailsText = detailsMatch ? detailsMatch[1] : null;
          if (statusCode && detailsText && detailsText !== "{}") {
            description = `[${statusCode}] ${detailsText}`;
          }

          toast({ title: "Erro ao enviar", description, variant: "destructive" });
        },
      },
    );

    setMsgText("");
  }, [conversationId, msgText, selectedWa, sendWhatsApp, toast]);

  const handleSendMedia = useCallback(
    async (file: File) => {
      if (!conversationId || !selectedWa) return;

      if (isLidContact(selectedWa)) {
        toast({ title: "Envio bloqueado", description: LID_BLOCK_MSG, variant: "destructive" });
        return;
      }

      const mediaTo = normalizeWhatsAppTo(selectedWa.wa_phone);
      if (!mediaTo) {
        toast({
          title: "Número inválido",
          description: "Não foi possível normalizar o telefone do contato.",
          variant: "destructive",
        });
        return;
      }

      try {
        const ext = file.name.split(".").pop() || "bin";
        const path = `outbound/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("wa-media")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("wa-media").getPublicUrl(path);
        const publicUrl = urlData.publicUrl;

        let msgType = "document";
        if (file.type.startsWith("image/")) msgType = "image";
        else if (file.type.startsWith("video/")) msgType = "video";
        else if (file.type.startsWith("audio/")) msgType = "audio";

        sendWhatsApp.mutate(
          {
            to: mediaTo,
            conversation_id: conversationId,
            type: msgType,
            media_url: publicUrl,
            media_mime: file.type,
            media_filename: file.name,
            caption: msgText.replace(/[\u200B-\u200D\uFEFF]/g, "").trim() || undefined,
          },
          {
            onError: (err: any) => {
              console.error("Send media error:", err);
              toast({
                title: "Erro ao enviar mídia",
                description: err?.message || "Tente novamente.",
                variant: "destructive",
              });
            },
          },
        );

        setMsgText("");
      } catch (err) {
        console.error("Upload error:", err);
        toast({ title: "Erro ao fazer upload", description: "Tente novamente.", variant: "destructive" });
      }
    },
    [conversationId, selectedWa, sendWhatsApp, msgText, toast],
  );

  const handleRetry = useCallback(
    (
      messageId: string,
      body: string,
      msgType?: string,
      mediaUrl?: string,
      mediaMime?: string,
      mediaFilename?: string,
    ) => {
      if (!conversationId || !selectedWa) return;

      if (isLidContact(selectedWa)) {
        toast({ title: "Envio bloqueado", description: LID_BLOCK_MSG, variant: "destructive" });
        return;
      }

      const retryTo = normalizeWhatsAppTo(selectedWa.wa_phone);
      if (!retryTo) {
        toast({
          title: "Número inválido",
          description: "Não foi possível normalizar o telefone do contato.",
          variant: "destructive",
        });
        return;
      }

      retryWhatsApp.mutate(
        {
          messageId,
          to: retryTo,
          text: msgType === "text" || !msgType ? body : undefined,
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
            toast({
              title: "Falha ao reenviar",
              description: err?.message || "Tente novamente.",
              variant: "destructive",
            });
          },
        },
      );
    },
    [conversationId, selectedWa, retryWhatsApp, toast],
  );

  return { msgText, setMsgText, handleSend, handleSendMedia, handleRetry };
}
