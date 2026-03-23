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
  channel: string;
  active_channel_code: string;
  lead_stage: string | null;
  lead_data: any;
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
    refetchInterval: 60000,
  });

  // Realtime subscription with granular cache updates
  useEffect(() => {
    const channel = supabase
      .channel("wa_conversations_realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wa_conversations" },
        (payload) => {
          const updated = payload.new as WaConversation;
          queryClient.setQueryData<WaConversation[]>(["wa_conversations"], (old) => {
            if (!old) return old;
            return old
              .map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
              .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wa_conversations" },
        (payload) => {
          const inserted = payload.new as WaConversation;
          queryClient.setQueryData<WaConversation[]>(["wa_conversations"], (old) => {
            if (!old) {
              queryClient.invalidateQueries({ queryKey: ["wa_conversations"] });
              return old;
            }
            return [inserted, ...old];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "wa_conversations" },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (!deletedId) return;
          queryClient.setQueryData<WaConversation[]>(["wa_conversations"], (old) => {
            if (!old) return old;
            return old.filter((c) => c.id !== deletedId);
          });
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
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return ((data as WaMessage[]) ?? []).reverse();
    },
    enabled: !!conversationId,
    refetchOnReconnect: true,
  });

  // Realtime for new messages + conversation updates (keeps chat in sync with inbox)
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
        (payload) => {
          queryClient.setQueryData(["wa_messages", conversationId], (old: any[]) => {
            if (!old) return old;
            const newMsg = payload.new;
            // Remove any optimistic temp messages and add the real one
            const filtered = old.filter((m: any) => !m.id.startsWith("temp-"));
            // Avoid duplicates
            if (filtered.some((m: any) => m.id === newMsg.id)) return filtered;
            return [...filtered, newMsg].sort((a: any, b: any) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wa_conversations",
          filter: `id=eq.${conversationId}`,
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

export function useAssumeConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("wa_conversations")
        .update({ assigned_to: user.id, status: "open" } as any)
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa_conversations"] });
    },
  });
}

export function useTransferConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, toAgentId, reason }: {
      conversationId: string;
      toAgentId: string;
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Get current assigned_to
      const { data: conv } = await supabase
        .from("wa_conversations")
        .select("assigned_to")
        .eq("id", conversationId)
        .single();

      // Create transfer record
      const { error: transferErr } = await supabase
        .from("conversation_transfers")
        .insert({
          conversation_id: conversationId,
          from_agent_id: conv?.assigned_to || user.id,
          to_agent_id: toAgentId,
          reason: reason || null,
        } as any);
      if (transferErr) throw transferErr;

      // Update conversation
      const { error } = await supabase
        .from("wa_conversations")
        .update({ assigned_to: toAgentId } as any)
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa_conversations"] });
    },
  });
}

export function useCloseConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, reason }: { conversationId: string; reason?: string }) => {
      const { error } = await supabase
        .from("wa_conversations")
        .update({ status: "closed" } as any)
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa_conversations"] });
    },
  });
}

export function useReopenConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("wa_conversations")
        .update({ status: "open", assigned_to: user.id } as any)
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa_conversations"] });
    },
  });
}
