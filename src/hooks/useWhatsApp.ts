import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WaConversation {
  id: string;
  mae_id: string | null;
  wa_phone: string;
  wa_name: string | null;
  status: string;
  assigned_to: string | null;
  unread_count: number;
  last_message_at: string;
  last_message_preview: string | null;
  labels: string[];
  created_at: string;
  updated_at: string;
  last_inbound_at: string | null;
}

export interface WaMessage {
  id: string;
  conversation_id: string;
  meta_message_id: string | null;
  direction: string;
  body: string | null;
  msg_type: string;
  status: string | null;
  sent_by: string | null;
  created_at: string;
  media_url: string | null;
  media_mime: string | null;
  media_filename: string | null;
  media_size: number | null;
  media_duration: number | null;
  meta_media_id: string | null;
}

export function useWaConversations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["wa_conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as WaConversation[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("wa_conversations_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_conversations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["wa_conversations"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function useWaMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["wa_messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("wa_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data as WaMessage[];
    },
    enabled: !!conversationId,
  });

  // Realtime for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`wa_messages_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wa_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["wa_messages", conversationId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wa_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["wa_messages", conversationId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      to: string;
      text?: string;
      conversation_id?: string;
      type?: string;
      media_url?: string;
      media_mime?: string;
      media_filename?: string;
      caption?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wa_conversations"] });
      if (variables.conversation_id) {
        queryClient.invalidateQueries({ queryKey: ["wa_messages", variables.conversation_id] });
      }
    },
  });
}

export function useRetryWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      messageId: string;
      to: string;
      text?: string;
      conversation_id: string;
      type?: string;
      media_url?: string;
      media_mime?: string;
      media_filename?: string;
    }) => {
      // Delete the failed message first
      await supabase
        .from("wa_messages")
        .delete()
        .eq("id", params.messageId);

      // Re-send
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          to: params.to,
          text: params.text,
          conversation_id: params.conversation_id,
          type: params.type,
          media_url: params.media_url,
          media_mime: params.media_mime,
          media_filename: params.media_filename,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wa_conversations"] });
      queryClient.invalidateQueries({ queryKey: ["wa_messages", variables.conversation_id] });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("wa_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa_conversations"] });
    },
  });
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("wa_conversations")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa_conversations"] });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, newBody, conversationId }: {
      messageId: string;
      newBody: string;
      conversationId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("wa_messages")
        .update({
          body: newBody,
          edited_at: new Date().toISOString(),
          edited_by_agent_id: user.id,
        } as any)
        .eq("id", messageId);
      if (error) throw error;
      return { conversationId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wa_messages", variables.conversationId] });
    },
  });
}
