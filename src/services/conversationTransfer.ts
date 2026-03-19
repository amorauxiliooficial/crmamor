import { supabase } from "@/integrations/supabase/client";

export interface TransferToEvolutionParams {
  conversationId: string;
  instanceId: string;
  reason?: string;
}

export interface TransferResult {
  success: boolean;
  error?: string;
}

/**
 * Transfer a conversation from its current channel (usually Meta/official)
 * to a WhatsApp Web instance via Evolution API.
 *
 * Steps:
 * 1. Validate conversation + instance exist
 * 2. Record in conversation_transfers (channel transfer)
 * 3. Record in conversation_events
 * 4. Update wa_conversations (active_channel_code, preferred_channel, instance_id, labels)
 * 5. Insert system message in wa_messages
 */
export async function transferConversationToEvolution(
  params: TransferToEvolutionParams
): Promise<TransferResult> {
  const { conversationId, instanceId, reason } = params;

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    // 1. Fetch conversation
    const { data: conv, error: convErr } = await supabase
      .from("wa_conversations")
      .select("id, active_channel_code, instance_id, labels, wa_name, status")
      .eq("id", conversationId)
      .single();

    if (convErr || !conv) throw new Error("Conversa não encontrada");

    // 2. Fetch instance
    const { data: instance, error: instErr } = await supabase
      .from("whatsapp_instances")
      .select("id, name, evolution_instance_name, status")
      .eq("id", instanceId)
      .single();

    if (instErr || !instance) throw new Error("Instância não encontrada");

    if (instance.status !== "connected") {
      throw new Error(`Instância "${instance.name}" não está conectada. Conecte via QR Code primeiro.`);
    }

    const fromChannel = (conv as any).active_channel_code ?? "official";

    // 3. Create transfer record
    const { error: transferErr } = await supabase
      .from("conversation_transfers")
      .insert({
        conversation_id: conversationId,
        from_channel_code: fromChannel,
        to_channel_code: "evolution",
        from_instance_id: (conv as any).instance_id ?? null,
        to_instance_id: instanceId,
        triggered_by: user.id,
        reason: reason || `Transferência para WhatsApp Web (${instance.name})`,
      } as any);

    if (transferErr) {
      console.error("Transfer record error:", transferErr);
      throw new Error("Erro ao registrar transferência");
    }

    // 4. Create conversation event
    await supabase.from("conversation_events").insert({
      conversation_id: conversationId,
      event_type: "channel_to_web",
      created_by_agent_id: user.id,
      meta: {
        from_channel: fromChannel,
        to_channel: "evolution",
        instance_id: instanceId,
        instance_name: instance.name,
        evolution_instance_name: instance.evolution_instance_name,
        reason: reason || null,
      },
    } as any);

    // 5. Update conversation
    const currentLabels: string[] = (conv as any).labels ?? [];
    const handoffLabel = `handoff:${fromChannel}->evolution`;
    const newLabels = currentLabels.includes(handoffLabel)
      ? currentLabels
      : [...currentLabels.filter(l => !l.startsWith("handoff:")), handoffLabel];

    const { error: updateErr } = await supabase
      .from("wa_conversations")
      .update({
        active_channel_code: "evolution",
        preferred_channel: "evolution",
        instance_id: instanceId,
        labels: newLabels,
        status: conv.status === "closed" ? "open" : conv.status,
        ai_enabled: false, // Disable AI on manual channel
      } as any)
      .eq("id", conversationId);

    if (updateErr) {
      console.error("Update conversation error:", updateErr);
      throw new Error("Erro ao atualizar conversa");
    }

    // 6. Insert system message
    await supabase.from("wa_messages").insert({
      conversation_id: conversationId,
      direction: "out",
      body: `🔄 Conversa transferida do canal ${fromChannel === "official" ? "Meta Oficial" : fromChannel} para WhatsApp Web (instância: ${instance.name}).`,
      msg_type: "text",
      status: "sent",
      sent_by: user.id,
      channel: "system",
    } as any);

    return { success: true };
  } catch (err: any) {
    console.error("transferConversationToEvolution error:", err);
    return { success: false, error: err.message || "Erro desconhecido" };
  }
}

/**
 * Transfer conversation back from Evolution to official (Meta) channel.
 */
export async function transferConversationToOfficial(
  conversationId: string,
  reason?: string
): Promise<TransferResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const { data: conv } = await supabase
      .from("wa_conversations")
      .select("id, active_channel_code, instance_id, labels")
      .eq("id", conversationId)
      .single();

    if (!conv) throw new Error("Conversa não encontrada");

    const fromChannel = (conv as any).active_channel_code ?? "evolution";

    await supabase.from("conversation_transfers").insert({
      conversation_id: conversationId,
      from_channel_code: fromChannel,
      to_channel_code: "official",
      from_instance_id: (conv as any).instance_id ?? null,
      to_instance_id: null,
      triggered_by: user.id,
      reason: reason || "Retorno para canal oficial Meta",
    } as any);

    await supabase.from("conversation_events").insert({
      conversation_id: conversationId,
      event_type: "channel_to_official",
      created_by_agent_id: user.id,
      meta: { from_channel: fromChannel, to_channel: "official" },
    } as any);

    const currentLabels: string[] = (conv as any).labels ?? [];
    const newLabels = currentLabels.filter(l => !l.startsWith("handoff:"));

    await supabase
      .from("wa_conversations")
      .update({
        active_channel_code: "official",
        preferred_channel: "meta_api",
        instance_id: null,
        labels: newLabels,
      } as any)
      .eq("id", conversationId);

    await supabase.from("wa_messages").insert({
      conversation_id: conversationId,
      direction: "out",
      body: "📱 Conversa transferida de volta para o canal Meta Oficial.",
      msg_type: "text",
      status: "sent",
      sent_by: user.id,
      channel: "system",
    } as any);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro desconhecido" };
  }
}
