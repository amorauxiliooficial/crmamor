import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { buildCorsHeaders } from "../_shared/cors.ts";

let corsHeaders: Record<string, string> = {};
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
  if (convo.ai_agent_id) {
    const { data } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", convo.ai_agent_id)
      .eq("is_active", true)
      .single();
    if (data) return data;
  }

  const convoLabels: string[] = convo.labels || [];
  if (convoLabels.length > 0) {
    const { data: agents } = await supabase.from("ai_agents").select("*").eq("is_active", true).eq("is_default", false);
    if (agents) {
      for (const agent of agents) {
        const depts: string[] = agent.departments || [];
        if (depts.some((d: string) => convoLabels.includes(d))) return agent;
      }
    }
  }

  const { data: defaultAgent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("is_default", true)
    .eq("is_active", true)
    .limit(1)
    .single();
  return defaultAgent || null;
}

function getEffectiveConfig(agent: any): any {
  if (agent?.published_config) return { ...agent, ...agent.published_config };
  return agent;
}

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
    const enabledTools = Object.entries(tools)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    if (enabledTools.length > 0) {
      prompt += `\n\nFERRAMENTAS HABILITADAS: ${enabledTools.join(", ")}`;
      if (enabledTools.includes("handoff_human")) {
        prompt += "\n- Se a pessoa insistir em falar com humano, responda EXATAMENTE: HANDOFF_REQUEST";
      }
      if (enabledTools.includes("qualify_lead")) {
        prompt +=
          "\n- Colete informações essenciais de forma natural (nome, tipo de evento, data, situação trabalhista)";
        prompt +=
          "\n- Quando coletar um dado, inclua no final da resposta uma linha oculta no formato: [DADOS: campo=valor]";
        prompt +=
          "\n- Campos possíveis: nome, tipo_evento, data_evento, situacao_trabalhista, carteira_assinada, contribui_inss, telefone";
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

async function executeToolActions(
  supabase: any,
  aiReply: string,
  conversationId: string,
  agentConfig: any,
): Promise<{ cleanReply: string; actions: string[] }> {
  const actions: string[] = [];
  let cleanReply = aiReply;

  const dataMatches = aiReply.matchAll(/\[DADOS:\s*(\w+)=([^\]]+)\]/gi);
  for (const match of dataMatches) {
    const field = match[1];
    const value = match[2].trim();
    cleanReply = cleanReply.replace(match[0], "").trim();

    await supabase.from("conversation_events").insert({
      conversation_id: conversationId,
      event_type: "ai_qualify_data",
      meta: { field, value, agent_id: agentConfig?.id, agent_name: agentConfig?.name },
    });
    actions.push(`qualify:${field}=${value}`);
  }

  const tagMatches = aiReply.matchAll(/\[TAG:\s*([^\]]+)\]/gi);
  for (const match of tagMatches) {
    const tag = match[1].trim();
    cleanReply = cleanReply.replace(match[0], "").trim();

    const { data: convo } = await supabase.from("wa_conversations").select("labels").eq("id", conversationId).single();

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

  cleanReply = cleanReply.replace(/\n{3,}/g, "\n\n").trim();
  return { cleanReply, actions };
}

function firstNameFromAny(name?: string | null): string {
  const s = (name || "").trim();
  if (!s) return "tudo bem";
  return s.split(/\s+/)[0] || "tudo bem";
}

serve(async (req: Request): Promise<Response> => {
  corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const internalFnToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN") || "";

  // ✅ IMPORTANT: use service role client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
  });

  if (!openaiKey) {
    console.error("❌ OPENAI_API_KEY not configured");
    return jsonError("OPENAI_API_KEY not configured", 500);
  }

  // ✅ helper: send via whatsapp-send with internal auth + template fallback fields
  async function sendWhatsAppMessage(payload: any, context: string) {
    const res = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "x-internal-token": internalFnToken,
      },
      body: JSON.stringify(payload),
    });

    let body: any = null;
    try {
      body = await res.json();
    } catch {}

    if (!res.ok) {
      console.error(`❌ whatsapp-send failed (${context}):`, res.status, JSON.stringify(body).slice(0, 300));
    }
    return { res, body };
  }

  try {
    const body = await req.json();

    if (body.preview_mode) {
      return await handlePreview(body, openaiKey);
    }

    const { conversation_id, trigger_message_id } = body;
    console.log(`🤖 AI Reply triggered: conv=${conversation_id}, trigger=${trigger_message_id}`);

    if (!conversation_id) return jsonError("Missing conversation_id", 400);

    // 1) conversation
    const { data: convo, error: convoErr } = await supabase
      .from("wa_conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();

    if (convoErr || !convo) {
      console.error("❌ Conversation not found:", convoErr);
      return jsonError("Conversation not found", 404);
    }

    // first name for template fallback
    const firstName = firstNameFromAny(convo.wa_name);

    // 2) idempotency
    if (trigger_message_id && convo.last_ai_trigger_msg_id === trigger_message_id) {
      console.log("⏭️ Skipping: idempotent duplicate");
      return jsonOk({ skipped: true, reason: "idempotent_duplicate" });
    }

    // 3) eligibility
    const labels: string[] = convo.labels || [];
    const aiEnabled = convo.ai_enabled === true || labels.includes("AI_ON");

    if (!aiEnabled) return jsonOk({ skipped: true, reason: "ai_not_enabled" });

    const activeChannel = convo.active_channel_code || convo.channel || "official";
    if (activeChannel === "web_manual_team") return jsonOk({ skipped: true, reason: "web_manual_channel" });
    if (convo.status === "closed") return jsonOk({ skipped: true, reason: "closed" });
    if (labels.includes("HANDOFF_HUMAN")) return jsonOk({ skipped: true, reason: "handoff_human" });
    if (labels.includes("AI_PAUSED")) return jsonOk({ skipped: true, reason: "ai_paused" });
    if (convo.assigned_to && !labels.includes("AI_PRIMARY") && !convo.ai_enabled) {
      return jsonOk({ skipped: true, reason: "assigned_to_human" });
    }

    // 4) resolve agent
    const rawAgent = await resolveAgent(supabase, convo);
    const agentConfig = rawAgent ? getEffectiveConfig(rawAgent) : null;
    const selectedModel = agentConfig?.model || DEFAULT_MODEL;
    const maxTokens = agentConfig?.max_tokens || 300;
    const agentName = agentConfig?.name || "Emily";

    console.log(`📋 Agent: ${agentName}, model=${selectedModel}, max_tokens=${maxTokens}`);

    // 5) system prompt
    const systemPrompt = buildSystemPrompt(agentConfig || {});

    // 6) last N messages
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
      return jsonOk({ skipped: true, reason: "last_msg_not_inbound" });
    }

    // 7) debounce
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
      return jsonOk({ skipped: true, reason: "debounce" });
    }

    // 8) build OpenAI messages
    const chatMessages: Array<{ role: string; content: string }> = [{ role: "system", content: systemPrompt }];
    for (const msg of sortedMessages) {
      if (!msg.body || msg.body.trim() === "") continue;
      chatMessages.push({
        role: msg.direction === "in" ? "user" : "assistant",
        content: msg.body,
      });
    }

    // 9) human delay
    const delay = HUMAN_DELAY_MS.min + Math.random() * (HUMAN_DELAY_MS.max - HUMAN_DELAY_MS.min);
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 10) OpenAI call
    console.log(`🧠 Calling OpenAI (${selectedModel}) with ${chatMessages.length} messages...`);
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
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
    if (!openaiRes.ok) {
      console.error(`❌ OpenAI error (${openaiRes.status}):`, JSON.stringify(openaiBody).slice(0, 500));
      return jsonError(`OpenAI error: ${openaiBody?.error?.message}`, 502);
    }

    const rawReply = openaiBody.choices?.[0]?.message?.content?.trim();
    console.log(`✅ OpenAI response: "${rawReply?.slice(0, 120)}..."`);

    if (!rawReply) return jsonError("Empty AI response", 502);

    // 11) handoff
    const userAskedHandoff = HANDOFF_KEYWORDS.some((kw) => (lastMsg.body || "").toLowerCase().includes(kw));
    if (rawReply.includes("HANDOFF_REQUEST") || userAskedHandoff) {
      console.log("🤝 Handoff detected — transferring to human");

      const updatedLabels = [...labels.filter((l) => l !== "AI_ON"), "HANDOFF_HUMAN"];
      await supabase
        .from("wa_conversations")
        .update({ labels: updatedLabels, ai_enabled: false })
        .eq("id", conversation_id);

      const handoffText =
        "Entendi! Vou te encaminhar para um dos nossos atendentes. Alguém da equipe vai te responder em breve 😊";

      await sendWhatsAppMessage(
        {
          to: convo.wa_phone,
          type: "text",
          text: handoffText,
          conversation_id,

          // ✅ fallback automático de template
          window_fallback_template: true,
          template_name: "retomar_atendimento",
          template_language: "pt_BR",
          first_name: firstName,
        },
        "handoff",
      );

      await supabase
        .from("wa_conversations")
        .update({ last_ai_trigger_msg_id: trigger_message_id })
        .eq("id", conversation_id);

      return jsonOk({ action: "handoff" });
    }

    // 12) tools
    const { cleanReply, actions } = await executeToolActions(supabase, rawReply, conversation_id, agentConfig);

    if (actions.length > 0) {
      console.log(`🔧 Tool actions executed: ${actions.join(", ")}`);
    }

    // 13) send AI reply
    console.log(`📤 Sending AI reply to +${convo.wa_phone}`);
    const { res: sendRes } = await sendWhatsAppMessage(
      {
        to: convo.wa_phone,
        type: "text",
        text: cleanReply,
        conversation_id,

        // ✅ fallback automático de template
        window_fallback_template: true,
        template_name: "retomar_atendimento",
        template_language: "pt_BR",
        first_name: firstName,
      },
      "ai_reply",
    );

    if (!sendRes.ok) {
      return jsonError("Failed to send message", 502);
    }

    // 14) idempotency mark
    await supabase
      .from("wa_conversations")
      .update({ last_ai_trigger_msg_id: trigger_message_id })
      .eq("id", conversation_id);

    const totalLatency = Date.now() - startTime;
    console.log(`✅ AI reply done (${totalLatency}ms)`);

    return jsonOk({ success: true, model: selectedModel, agent: agentName, latency_ms: totalLatency });
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

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
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
    if (!res.ok) return jsonOk({ reply: `Erro: ${data?.error?.message}`, model });

    const rawReply = data.choices?.[0]?.message?.content?.trim() || "Sem resposta";

    const cleanReply = rawReply
      .replace(/\[DADOS:[^\]]+\]/gi, "")
      .replace(/\[TAG:[^\]]+\]/gi, "")
      .replace(/\[FOLLOWUP:[^\]]+\]/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return jsonOk({ reply: cleanReply, model });
  } catch (err) {
    return jsonOk({ reply: `Erro: ${String(err)}`, model });
  }
}

function jsonOk(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
