import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_HISTORY = 20;
const DEBOUNCE_SECONDS = 10;
const HUMAN_DELAY_MS = { min: 3000, max: 8000 };
const HANDOFF_KEYWORDS = ["humano", "atendente", "pessoa real", "falar com alguém", "urgente", "emergência"];

const FALLBACK_SYSTEM_PROMPT = `Você é Emily, assistente virtual da equipe de salário-maternidade. Seu objetivo é qualificar a mãe de forma natural e empática via conversa.

REGRAS:
- Conduza a conversa de forma natural, como uma pessoa real. NÃO use listas, checklists ou bullet points.
- Faça uma pergunta por vez, de forma casual e acolhedora.
- Responda em português brasileiro informal e educado.
- Nunca mencione que é uma IA ou assistente virtual.
- Se a pessoa pedir para falar com um humano/atendente, responda EXATAMENTE: "HANDOFF_REQUEST" (só essa palavra).
- Se não souber responder algo específico do processo, diga que vai verificar com a equipe.
- Mantenha respostas curtas (1-3 frases no máximo).
- Use emojis com moderação (máximo 1 por mensagem).
- Informações que você precisa coletar naturalmente: nome, tipo de evento (parto/adoção), data do evento, situação trabalhista, se tem carteira assinada, se contribui para o INSS.

IMPORTANTE: Você está respondendo via WhatsApp. Seja concisa e direta.`;

// ── Resolve which agent to use for a conversation ──
async function resolveAgent(supabase: any, convo: any): Promise<any> {
  // Priority 1: explicit agent on conversation
  if (convo.ai_agent_id) {
    const { data } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", convo.ai_agent_id)
      .eq("is_active", true)
      .single();
    if (data) return data;
  }

  // Priority 2: match by labels/departments
  const convoLabels: string[] = convo.labels || [];
  if (convoLabels.length > 0) {
    const { data: agents } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("is_active", true)
      .eq("is_default", false);
    if (agents) {
      for (const agent of agents) {
        const depts: string[] = agent.departments || [];
        if (depts.some((d: string) => convoLabels.includes(d))) return agent;
      }
    }
  }

  // Priority 3: default agent
  const { data: defaultAgent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("is_default", true)
    .eq("is_active", true)
    .limit(1)
    .single();
  return defaultAgent || null;
}

// ── Get effective config (published or draft) ──
function getEffectiveConfig(agent: any): any {
  if (agent.published_config) return { ...agent, ...agent.published_config };
  return agent;
}

// ── Build system prompt from agent config ──
function buildSystemPrompt(config: any): string {
  let prompt = config.system_prompt || FALLBACK_SYSTEM_PROMPT;

  if (config.knowledge_instructions) {
    prompt += `\n\nINSTRUÇÕES ADICIONAIS DE CONHECIMENTO:\n${config.knowledge_instructions}`;
  }

  const faq = config.knowledge_faq;
  if (faq && Array.isArray(faq) && faq.length > 0) {
    prompt += "\n\nPERGUNTAS FREQUENTES (use como base para respostas):";
    for (const item of faq) {
      if (item.question && item.answer) {
        prompt += `\nP: ${item.question}\nR: ${item.answer}`;
      }
    }
  }

  const tools = config.tools_config;
  if (tools && typeof tools === "object") {
    const enabledTools = Object.entries(tools).filter(([_, v]) => v).map(([k]) => k);
    if (enabledTools.length > 0) {
      prompt += `\n\nFERRAMENTAS HABILITADAS: ${enabledTools.join(", ")}`;
      if (enabledTools.includes("handoff_human")) {
        prompt += "\n- Se a pessoa insistir em falar com humano, responda EXATAMENTE: HANDOFF_REQUEST";
      }
      if (enabledTools.includes("qualify_lead")) {
        prompt += "\n- Colete informações essenciais de forma natural (nome, tipo de evento, data, situação trabalhista)";
        prompt += "\n- Quando coletar um dado, inclua no final da resposta uma linha oculta no formato: [DADOS: campo=valor]";
        prompt += "\n- Campos possíveis: nome, tipo_evento, data_evento, situacao_trabalhista, carteira_assinada, contribui_inss, telefone";
      }
      if (enabledTools.includes("apply_tags")) {
        prompt += "\n- Quando identificar o perfil do lead, inclua: [TAG: nome_da_tag]";
      }
      if (enabledTools.includes("schedule_followup")) {
        prompt += "\n- Se combinar de retornar ou agendar contato, inclua: [FOLLOWUP: YYYY-MM-DD motivo]";
      }
    }
  }

  if (config.tone) {
    prompt += `\n\nTOM DE CONVERSA: Seja ${config.tone}.`;
  }

  return prompt;
}

// ── Execute tool actions parsed from AI response ──
async function executeToolActions(supabase: any, aiReply: string, conversationId: string, agentConfig: any): Promise<{ cleanReply: string; actions: string[] }> {
  const actions: string[] = [];
  let cleanReply = aiReply;

  // Extract and execute [DADOS: campo=valor]
  const dataMatches = aiReply.matchAll(/\[DADOS:\s*(\w+)=([^\]]+)\]/gi);
  for (const match of dataMatches) {
    const field = match[1];
    const value = match[2].trim();
    cleanReply = cleanReply.replace(match[0], "").trim();

    // Log the qualification data as event
    await supabase.from("conversation_events").insert({
      conversation_id: conversationId,
      event_type: "ai_qualify_data",
      meta: { field, value, agent_id: agentConfig?.id, agent_name: agentConfig?.name },
    });
    actions.push(`qualify:${field}=${value}`);
  }

  // Extract and execute [TAG: tag_name]
  const tagMatches = aiReply.matchAll(/\[TAG:\s*([^\]]+)\]/gi);
  for (const match of tagMatches) {
    const tag = match[1].trim();
    cleanReply = cleanReply.replace(match[0], "").trim();

    const { data: convo } = await supabase
      .from("wa_conversations")
      .select("labels")
      .eq("id", conversationId)
      .single();

    const currentLabels: string[] = convo?.labels || [];
    if (!currentLabels.includes(tag)) {
      await supabase
        .from("wa_conversations")
        .update({ labels: [...currentLabels, tag] })
        .eq("id", conversationId);
    }

    await supabase.from("conversation_events").insert({
      conversation_id: conversationId,
      event_type: "ai_apply_tag",
      meta: { tag, agent_id: agentConfig?.id },
    });
    actions.push(`tag:${tag}`);
  }

  // Extract and execute [FOLLOWUP: date reason]
  const followupMatches = aiReply.matchAll(/\[FOLLOWUP:\s*(\d{4}-\d{2}-\d{2})\s+([^\]]+)\]/gi);
  for (const match of followupMatches) {
    const date = match[1];
    const reason = match[2].trim();
    cleanReply = cleanReply.replace(match[0], "").trim();

    await supabase.from("conversation_events").insert({
      conversation_id: conversationId,
      event_type: "ai_schedule_followup",
      meta: { scheduled_date: date, reason, agent_id: agentConfig?.id },
    });
    actions.push(`followup:${date} ${reason}`);
  }

  // Clean up empty lines from removed markers
  cleanReply = cleanReply.replace(/\n{3,}/g, "\n\n").trim();

  return { cleanReply, actions };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (!openaiKey) {
    console.error("❌ OPENAI_API_KEY not configured");
    return jsonError("OPENAI_API_KEY not configured", 500);
  }

  try {
    const body = await req.json();

    // ── Preview mode ──
    if (body.preview_mode) {
      return await handlePreview(body, openaiKey);
    }

    const { conversation_id, trigger_message_id } = body;
    console.log(`🤖 AI Reply triggered: conv=${conversation_id}, trigger=${trigger_message_id}`);

    if (!conversation_id) return jsonError("Missing conversation_id", 400);

    // ── 1. Fetch conversation ──
    const { data: convo, error: convoErr } = await supabase
      .from("wa_conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();

    if (convoErr || !convo) {
      console.error("❌ Conversation not found:", convoErr);
      return jsonError("Conversation not found", 404);
    }

    // ── 2. Idempotency: check if we already processed this trigger ──
    if (trigger_message_id && convo.last_ai_trigger_msg_id === trigger_message_id) {
      console.log("⏭️ Skipping: already processed this trigger_message_id (idempotency)");
      return jsonOk({ skipped: true, reason: "idempotent_duplicate" });
    }

    // ── 3. Eligibility checks ──
    const labels: string[] = convo.labels || [];
    const aiEnabled = convo.ai_enabled === true || labels.includes("AI_ON");

    if (!aiEnabled) {
      console.log("⏭️ Skipping: AI not enabled");
      return jsonOk({ skipped: true, reason: "ai_not_enabled" });
    }
    // Skip if conversation is on web_manual_team channel
    const activeChannel = convo.active_channel_code || convo.channel || "official";
    if (activeChannel === "web_manual_team") {
      console.log("⏭️ Skipping: web_manual_team channel — manual mode");
      return jsonOk({ skipped: true, reason: "web_manual_channel" });
    }
    if (convo.status === "closed") {
      console.log("⏭️ Skipping: conversation is closed");
      return jsonOk({ skipped: true, reason: "closed" });
    }
    if (labels.includes("HANDOFF_HUMAN")) {
      console.log("⏭️ Skipping: HANDOFF_HUMAN active");
      return jsonOk({ skipped: true, reason: "handoff_human" });
    }
    if (labels.includes("AI_PAUSED")) {
      console.log("⏭️ Skipping: AI_PAUSED");
      return jsonOk({ skipped: true, reason: "ai_paused" });
    }
    // If assigned to human without AI override
    if (convo.assigned_to && !labels.includes("AI_PRIMARY") && !convo.ai_enabled) {
      console.log("⏭️ Skipping: assigned to human without AI_PRIMARY");
      return jsonOk({ skipped: true, reason: "assigned_to_human" });
    }

    // ── 4. Resolve agent ──
    const rawAgent = await resolveAgent(supabase, convo);
    const agentConfig = rawAgent ? getEffectiveConfig(rawAgent) : null;
    const selectedModel = agentConfig?.model || DEFAULT_MODEL;
    const maxTokens = agentConfig?.max_tokens || 300;
    const agentName = agentConfig?.name || "Emily";

    console.log(`📋 Agent: ${agentName}, model=${selectedModel}, max_tokens=${maxTokens}, published=${!!rawAgent?.published_config}`);

    // ── 5. Build system prompt ──
    const systemPrompt = buildSystemPrompt(agentConfig || {});

    // ── 6. Fetch last N messages ──
    const { data: messages, error: msgErr } = await supabase
      .from("wa_messages")
      .select("*")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY);

    if (msgErr) {
      console.error("❌ Error fetching messages:", msgErr);
      return jsonError("Error fetching messages", 500);
    }

    const sortedMessages = (messages || []).reverse();
    const lastMsg = sortedMessages[sortedMessages.length - 1];

    if (!lastMsg || lastMsg.direction !== "in") {
      console.log("⏭️ Skipping: last message is not inbound");
      return jsonOk({ skipped: true, reason: "last_msg_not_inbound" });
    }

    // ── 7. Debounce ──
    const debounceThreshold = new Date(Date.now() - DEBOUNCE_SECONDS * 1000).toISOString();
    const { data: recentAiMsgs } = await supabase
      .from("wa_messages")
      .select("id, created_at")
      .eq("conversation_id", conversation_id)
      .eq("direction", "out")
      .is("sent_by", null)
      .gte("created_at", debounceThreshold)
      .limit(1);

    if (recentAiMsgs && recentAiMsgs.length > 0) {
      console.log("⏭️ Skipping: AI replied recently (debounce)");
      return jsonOk({ skipped: true, reason: "debounce" });
    }

    // ── 8. Build OpenAI messages ──
    const chatMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];
    for (const msg of sortedMessages) {
      if (!msg.body || msg.body.trim() === "") continue;
      chatMessages.push({
        role: msg.direction === "in" ? "user" : "assistant",
        content: msg.body,
      });
    }

    // ── 9. Human delay ──
    const delay = HUMAN_DELAY_MS.min + Math.random() * (HUMAN_DELAY_MS.max - HUMAN_DELAY_MS.min);
    console.log(`⏳ Simulating human delay: ${Math.round(delay)}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // ── 10. Call OpenAI ──
    console.log(`🧠 Calling OpenAI (${selectedModel}) with ${chatMessages.length} messages...`);
    const openaiStart = Date.now();

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: chatMessages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    const openaiBody = await openaiRes.json();
    const openaiLatency = Date.now() - openaiStart;

    if (!openaiRes.ok) {
      console.error(`❌ OpenAI error (${openaiRes.status}):`, JSON.stringify(openaiBody).slice(0, 500));
      await supabase.from("conversation_events").insert({
        conversation_id,
        event_type: "ai_error",
        meta: {
          error: openaiBody?.error?.message || "Unknown",
          model: selectedModel, agent_name: agentName, agent_id: agentConfig?.id,
          status: openaiRes.status, trigger_message_id,
        },
      });
      return jsonError(`OpenAI error: ${openaiBody?.error?.message}`, 502);
    }

    const rawReply = openaiBody.choices?.[0]?.message?.content?.trim();
    const tokensUsed = openaiBody.usage;

    console.log(`✅ OpenAI response (${openaiLatency}ms, ${tokensUsed?.total_tokens || "?"} tokens): "${rawReply?.slice(0, 100)}..."`);

    if (!rawReply) {
      console.error("❌ Empty AI response");
      return jsonError("Empty AI response", 502);
    }

    // ── 11. Check for handoff ──
    if (rawReply.includes("HANDOFF_REQUEST") || HANDOFF_KEYWORDS.some(kw => lastMsg.body?.toLowerCase().includes(kw))) {
      console.log("🤝 Handoff detected — transferring to human");
      const updatedLabels = [...labels.filter(l => l !== "AI_ON"), "HANDOFF_HUMAN"];
      await supabase.from("wa_conversations").update({ labels: updatedLabels, ai_enabled: false }).eq("id", conversation_id);

      await supabase.from("conversation_events").insert({
        conversation_id, event_type: "ai_handoff",
        meta: { reason: "user_requested", trigger_message_id, model: selectedModel, agent_name: agentName, agent_id: agentConfig?.id, latency_ms: openaiLatency, user_message: lastMsg.body?.slice(0, 200) },
      });

      const handoffText = "Entendi! Vou te encaminhar para um dos nossos atendentes. Alguém da equipe vai te responder em breve 😊";
      await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ to: convo.wa_phone, text: handoffText, conversation_id }),
      });

      // Mark idempotency
      await supabase.from("wa_conversations").update({ last_ai_trigger_msg_id: trigger_message_id }).eq("id", conversation_id);

      return jsonOk({ action: "handoff", latency_ms: Date.now() - startTime });
    }

    // ── 12. Execute tool actions from reply ──
    const { cleanReply, actions } = await executeToolActions(supabase, rawReply, conversation_id, agentConfig);

    if (actions.length > 0) {
      console.log(`🔧 Tool actions executed: ${actions.join(", ")}`);
    }

    // ── 13. Send AI reply ──
    console.log(`📤 Sending AI reply to +${convo.wa_phone}`);
    const sendRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ to: convo.wa_phone, text: cleanReply, conversation_id }),
    });

    const sendBody = await sendRes.json();
    if (!sendRes.ok) {
      console.error("❌ whatsapp-send failed:", JSON.stringify(sendBody).slice(0, 300));
      await supabase.from("conversation_events").insert({
        conversation_id, event_type: "ai_error",
        meta: { error: "whatsapp-send failed", send_status: sendRes.status, model: selectedModel, agent_id: agentConfig?.id, trigger_message_id },
      });
      return jsonError("Failed to send message", 502);
    }

    // Mark as AI-authored
    if (sendBody.meta_message_id) {
      await supabase.from("wa_messages").update({ sent_by: null }).eq("meta_message_id", sendBody.meta_message_id);
    }

    // ── 14. Mark idempotency ──
    await supabase.from("wa_conversations").update({ last_ai_trigger_msg_id: trigger_message_id }).eq("id", conversation_id);

    // ── 15. Log ai_replied event ──
    await supabase.from("conversation_events").insert({
      conversation_id, event_type: "ai_replied",
      meta: {
        model: selectedModel, agent_name: agentName, agent_id: agentConfig?.id,
        latency_ms: openaiLatency, total_latency_ms: Date.now() - startTime,
        tokens: tokensUsed || null, trigger_message_id,
        reply_preview: cleanReply.slice(0, 100),
        tool_actions: actions.length > 0 ? actions : undefined,
      },
    });

    const totalLatency = Date.now() - startTime;
    console.log(`✅ AI reply sent successfully (${totalLatency}ms total, ${tokensUsed?.total_tokens || "?"} tokens, ${actions.length} tools)`);

    return jsonOk({ success: true, model: selectedModel, agent: agentName, latency_ms: totalLatency, tokens: tokensUsed, tool_actions: actions });

  } catch (error) {
    console.error("❌ wa-ai-reply error:", error);
    return jsonError("Internal server error: " + String(error), 500);
  }
});

// ── Preview handler ──
async function handlePreview(body: any, openaiKey: string): Promise<Response> {
  const { preview_message, agent_config } = body;

  const systemPrompt = buildSystemPrompt(agent_config || {});
  const model = agent_config?.model || DEFAULT_MODEL;
  const maxTokens = agent_config?.max_tokens || 300;

  const startTime = Date.now();

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: preview_message },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const latency = Date.now() - startTime;

    if (!res.ok) return jsonOk({ reply: `Erro: ${data?.error?.message}`, model, latency_ms: latency });

    const rawReply = data.choices?.[0]?.message?.content?.trim() || "Sem resposta";
    const tokens = data.usage;

    // Parse tool actions for preview (don't execute)
    const toolActions: string[] = [];
    const dataMatches = rawReply.matchAll(/\[DADOS:\s*(\w+)=([^\]]+)\]/gi);
    for (const m of dataMatches) toolActions.push(`qualify:${m[1]}=${m[2].trim()}`);
    const tagMatches = rawReply.matchAll(/\[TAG:\s*([^\]]+)\]/gi);
    for (const m of tagMatches) toolActions.push(`tag:${m[1].trim()}`);
    const followupMatches = rawReply.matchAll(/\[FOLLOWUP:\s*(\d{4}-\d{2}-\d{2})\s+([^\]]+)\]/gi);
    for (const m of followupMatches) toolActions.push(`followup:${m[1]} ${m[2].trim()}`);

    // Clean markers from reply for display
    const cleanReply = rawReply.replace(/\[DADOS:[^\]]+\]/gi, "").replace(/\[TAG:[^\]]+\]/gi, "").replace(/\[FOLLOWUP:[^\]]+\]/gi, "").replace(/\n{3,}/g, "\n\n").trim();

    return jsonOk({ reply: cleanReply, model, tokens, latency_ms: latency, tool_actions: toolActions });
  } catch (err) {
    return jsonOk({ reply: `Erro: ${String(err)}`, model, latency_ms: Date.now() - startTime });
  }
}

function jsonOk(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonError(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
