import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  summarize: `Você é um assistente de CRM especializado em processos previdenciários (salário-maternidade).
Analise a conversa abaixo e gere EXATAMENTE 3 bullets curtos em português:
1. **Contexto**: Quem é o contato e o que busca (1 frase)
2. **Status atual**: Situação atual da conversa/processo (1 frase)
3. **Próximo passo**: Ação recomendada para o atendente (1 frase)
Responda APENAS com os 3 bullets, sem introdução nem conclusão. Use emojis discretos.`,

  suggest: `Você é um atendente de CRM especializado em salário-maternidade. 
Com base na conversa, sugira UMA resposta curta e profissional para enviar ao contato.
Responda APENAS com o texto da mensagem sugerida, sem aspas nem introdução. Tom empático e objetivo.`,

  extract: `Analise a conversa e extraia dados relevantes do contato em formato bullet:
- Nome completo (se mencionado)
- CPF (se mencionado)
- Telefone
- Tipo de evento (parto/adoção)
- Status do processo
- Documentos mencionados
- Pendências identificadas
Responda APENAS com os dados encontrados. Se não encontrar algo, omita. Use emojis discretos.`,

  next_action: `Com base na conversa, sugira a PRÓXIMA AÇÃO concreta que o atendente deve tomar.
Formato:
**Ação**: [descrição curta]
**Prazo sugerido**: [hoje/amanhã/3 dias]
**Motivo**: [1 frase]
Responda APENAS neste formato, sem introdução.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.89.0");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, contactName, action = "summarize", conversationContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = PROMPTS[action] || PROMPTS.summarize;
    const contextSuffix = conversationContext ? `\nContexto CRM adicional: ${conversationContext}` : "";

    const chatMessages = messages.map((m: { de: string; texto: string }) => ({
      role: m.de === "atendente" ? "assistant" : "user",
      content: m.texto,
    }));

    const actionLabel = action === "suggest" ? "sugestão de resposta" : action === "extract" ? "extração de dados" : action === "next_action" ? "próxima ação" : "resumo";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt + contextSuffix },
          ...chatMessages,
          { role: "user", content: `Gere ${actionLabel} para o caso de ${contactName || "contato desconhecido"}.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao processar IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "Não foi possível processar.";

    return new Response(JSON.stringify({ summary: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI action error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
