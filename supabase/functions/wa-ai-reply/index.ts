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

    // ── Preview mode: simulate response without sending ──
    if (body.preview_mode) {
      return await handlePreview(body, openaiKey);
    }

    const { conversation_id, trigger_message_id } = body;

    console.log(`🤖 AI Reply triggered: conv=${conversation_id}, trigger=${trigger_message_id}`);

    if (!conversation_id) {
      return jsonError("Missing conversation_id", 400);
    }

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

    // ── 2. Eligibility checks ──
    const aiEnabled = convo.ai_enabled === true;
    const labels: string[] = convo.labels || [];

    // Support both new ai_enabled column and legacy AI_ON label
    if (!aiEnabled && !labels.includes("AI_ON")) {
      console.log("⏭️ Skipping: AI not enabled");
      return jsonOk({ skipped: true, reason: "ai_not_enabled" });
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

    // If assigned to a human and no AI_PRIMARY, skip
    if (convo.assigned_to && !labels.includes("AI_PRIMARY") && !aiEnabled) {
      console.log("⏭️ Skipping: assigned to human without AI_PRIMARY");
      return jsonOk({ skipped: true, reason: "assigned_to_human" });
    }

    // ── 3. Fetch agent config ──
    let agentConfig: any = null;
    const agentId = convo.ai_agent_id;

    if (agentId) {
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("id", agentId)
        .eq("is_active", true)
        .single();
      if (agent) agentConfig = agent;
    }

    // Fallback: use default agent
    if (!agentConfig) {
      const { data: defaultAgent } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("is_default", true)
        .eq("is_active", true)
        .limit(1)
        .single();
      if (defaultAgent) agentConfig = defaultAgent;
    }

    // Build config from agent or fallback
    const selectedModel = agentConfig?.model || DEFAULT_MODEL;
    const maxTokens = agentConfig?.max_tokens || 300;
    const agentName = agentConfig?.name || "Emily";

    console.log(`📋 Agent: ${agentName}, model=${selectedModel}, max_tokens=${maxTokens}`);

    // ── 4. Build system prompt from agent config ──
    let systemPrompt = agentConfig?.system_prompt || FALLBACK_SYSTEM_PROMPT;

    // Append knowledge instructions
    if (agentConfig?.knowledge_instructions) {
      systemPrompt += `\n\nINSTRUÇÕES ADICIONAIS DE CONHECIMENTO:\n${agentConfig.knowledge_instructions}`;
    }

    // Append FAQ
    const faq = agentConfig?.knowledge_faq;
    if (faq && Array.isArray(faq) && faq.length > 0) {
      systemPrompt += "\n\nPERGUNTAS FREQUENTES (use como base para respostas):";
      for (const item of faq) {
        if (item.question && item.answer) {
          systemPrompt += `\nP: ${item.question}\nR: ${item.answer}`;
        }
      }
    }

    // Append tools instructions
    const tools = agentConfig?.tools_config;
    if (tools && typeof tools === "object") {
      const enabledTools = Object.entries(tools).filter(([_, v]) => v).map(([k]) => k);
      if (enabledTools.length > 0) {
        systemPrompt += `\n\nFERRAMENTAS HABILITADAS: ${enabledTools.join(", ")}`;
        if (enabledTools.includes("handoff_human")) {
          systemPrompt += "\n- Se a pessoa insistir em falar com humano, responda EXATAMENTE: HANDOFF_REQUEST";
        }
        if (enabledTools.includes("qualify_lead")) {
          systemPrompt += "\n- Colete informações essenciais de forma natural (nome, tipo de evento, data, situação trabalhista)";
        }
      }
    }

    // Append tone
    if (agentConfig?.tone) {
      systemPrompt += `\n\nTOM DE CONVERSA: Seja ${agentConfig.tone}.`;
    }

    // ── 5. Fetch last N messages ──
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

    // Check last message is inbound
    const lastMsg = sortedMessages[sortedMessages.length - 1];
    if (!lastMsg || lastMsg.direction !== "in") {
      console.log("⏭️ Skipping: last message is not inbound");
      return jsonOk({ skipped: true, reason: "last_msg_not_inbound" });
    }

    // ── 6. Debounce ──
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

    // ── 7. Build OpenAI messages ──
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

    // ── 8. Simulate human delay ──
    const delay = HUMAN_DELAY_MS.min + Math.random() * (HUMAN_DELAY_MS.max - HUMAN_DELAY_MS.min);
    console.log(`⏳ Simulating human delay: ${Math.round(delay)}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // ── 9. Call OpenAI ──
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
          model: selectedModel,
          agent_name: agentName,
          agent_id: agentConfig?.id,
          status: openaiRes.status,
          trigger_message_id,
        },
      });

      return jsonError(`OpenAI error: ${openaiBody?.error?.message}`, 502);
    }

    const aiReply = openaiBody.choices?.[0]?.message?.content?.trim();
    const tokensUsed = openaiBody.usage;

    console.log(`✅ OpenAI response (${openaiLatency}ms, ${tokensUsed?.total_tokens || "?"} tokens): "${aiReply?.slice(0, 100)}..."`);

    if (!aiReply) {
      console.error("❌ Empty AI response");
      return jsonError("Empty AI response", 502);
    }

    // ── 10. Check for handoff request ──
    if (aiReply.includes("HANDOFF_REQUEST") || HANDOFF_KEYWORDS.some(kw => lastMsg.body?.toLowerCase().includes(kw))) {
      console.log("🤝 Handoff detected — transferring to human");

      const updatedLabels = [...labels.filter(l => l !== "AI_ON"), "HANDOFF_HUMAN"];
      await supabase
        .from("wa_conversations")
        .update({ labels: updatedLabels, ai_enabled: false })
        .eq("id", conversation_id);

      await supabase.from("conversation_events").insert({
        conversation_id,
        event_type: "ai_handoff",
        meta: {
          reason: "user_requested",
          trigger_message_id,
          model: selectedModel,
          agent_name: agentName,
          agent_id: agentConfig?.id,
          latency_ms: openaiLatency,
          user_message: lastMsg.body?.slice(0, 200),
        },
      });

      const handoffText = "Entendi! Vou te encaminhar para um dos nossos atendentes. Alguém da equipe vai te responder em breve 😊";

      const sendUrl = `${supabaseUrl}/functions/v1/whatsapp-send`;
      await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ to: convo.wa_phone, text: handoffText, conversation_id }),
      });

      // Mark as AI-sent
      const { data: latestMsg } = await supabase
        .from("wa_messages")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("direction", "out")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestMsg) {
        await supabase.from("wa_messages").update({ sent_by: null }).eq("id", latestMsg.id);
      }

      return jsonOk({ action: "handoff", latency_ms: Date.now() - startTime });
    }

    // ── 11. Send AI reply ──
    const sendUrl = `${supabaseUrl}/functions/v1/whatsapp-send`;
    console.log(`📤 Sending AI reply to +${convo.wa_phone}`);

    const sendRes = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ to: convo.wa_phone, text: aiReply, conversation_id }),
    });

    const sendBody = await sendRes.json();

    if (!sendRes.ok) {
      console.error("❌ whatsapp-send failed:", JSON.stringify(sendBody).slice(0, 300));

      await supabase.from("conversation_events").insert({
        conversation_id,
        event_type: "ai_error",
        meta: { error: "whatsapp-send failed", send_status: sendRes.status, model: selectedModel, agent_id: agentConfig?.id, trigger_message_id },
      });

      return jsonError("Failed to send message", 502);
    }

    // Mark as AI-authored
    if (sendBody.meta_message_id) {
      await supabase.from("wa_messages").update({ sent_by: null }).eq("meta_message_id", sendBody.meta_message_id);
    }

    // ── 12. Log ai_replied event ──
    await supabase.from("conversation_events").insert({
      conversation_id,
      event_type: "ai_replied",
      meta: {
        model: selectedModel,
        agent_name: agentName,
        agent_id: agentConfig?.id,
        latency_ms: openaiLatency,
        total_latency_ms: Date.now() - startTime,
        tokens: tokensUsed || null,
        trigger_message_id,
        reply_preview: aiReply.slice(0, 100),
      },
    });

    const totalLatency = Date.now() - startTime;
    console.log(`✅ AI reply sent successfully (${totalLatency}ms total, ${tokensUsed?.total_tokens || "?"} tokens)`);

    return jsonOk({ success: true, model: selectedModel, agent: agentName, latency_ms: totalLatency, tokens: tokensUsed });

  } catch (error) {
    console.error("❌ wa-ai-reply error:", error);
    return jsonError("Internal server error: " + String(error), 500);
  }
});

// ── Preview handler ──
async function handlePreview(body: any, openaiKey: string): Promise<Response> {
  const { preview_message, agent_config } = body;

  let systemPrompt = agent_config?.system_prompt || FALLBACK_SYSTEM_PROMPT;

  if (agent_config?.knowledge_instructions) {
    systemPrompt += `\n\nINSTRUÇÕES ADICIONAIS:\n${agent_config.knowledge_instructions}`;
  }

  const faq = agent_config?.knowledge_faq;
  if (faq && Array.isArray(faq) && faq.length > 0) {
    systemPrompt += "\n\nFAQ:";
    for (const item of faq) {
      if (item.question && item.answer) {
        systemPrompt += `\nP: ${item.question}\nR: ${item.answer}`;
      }
    }
  }

  if (agent_config?.tone) {
    systemPrompt += `\n\nTOM: Seja ${agent_config.tone}.`;
  }

  const model = agent_config?.model || DEFAULT_MODEL;
  const maxTokens = agent_config?.max_tokens || 300;

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
    if (!res.ok) return jsonOk({ reply: `Erro: ${data?.error?.message}` });
    return jsonOk({ reply: data.choices?.[0]?.message?.content?.trim() || "Sem resposta" });
  } catch (err) {
    return jsonOk({ reply: `Erro: ${String(err)}` });
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
