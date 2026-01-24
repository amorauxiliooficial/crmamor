import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prompt jurídico fixo - NÃO EDITÁVEL por usuários
const PROMPT_ANALISE_ELEGIBILIDADE = `Você é um especialista jurídico em direito previdenciário brasileiro, especializado em análise de elegibilidade para salário-maternidade.

TAREFA: Analise os dados fornecidos e determine a elegibilidade da segurada para o benefício de salário-maternidade com base na legislação vigente (Lei 8.213/91, Decreto 3.048/99 e IN INSS 128/2022).

REGRAS DE ANÁLISE:

1. CATEGORIA E CARÊNCIA:
- Empregada CLT: Sem carência
- Contribuinte Individual: 10 contribuições mensais
- MEI: 10 contribuições mensais  
- Facultativa: 10 contribuições mensais
- Segurada Especial: 10 meses de atividade rural
- Desempregada: Verificar período de graça

2. PERÍODO DE GRAÇA:
- 12 meses após última contribuição (regra geral)
- 24 meses se mais de 120 contribuições
- 36 meses se desempregada comprovada

3. PRAZOS LEGAIS:
- Pode requerer até 5 anos após o parto/adoção
- Início do benefício: data do parto ou 28 dias antes

4. ANÁLISE DO CNIS:
- Verificar vínculos ativos/inativos
- Verificar contribuições em dia
- Identificar gaps de contribuição
- Verificar qualidade de segurada

VOCÊ DEVE RESPONDER EXCLUSIVAMENTE NO FORMATO JSON ABAIXO:

{
  "categoria_identificada": "string - categoria previdenciária identificada",
  "carencia_status": "string - situação da carência (cumprida/não cumprida/parcialmente cumprida)",
  "periodo_graca_status": "string - situação do período de graça se aplicável",
  "situacao_cnis": "string - análise resumida do CNIS",
  "riscos_identificados": [
    {
      "tipo": "string - tipo do risco",
      "descricao": "string - descrição do risco",
      "gravidade": "alta | media | baixa"
    }
  ],
  "conclusao": "aprovada | aprovada_com_ressalvas | nao_aprovavel",
  "conclusao_detalhada": "string - explicação detalhada da conclusão",
  "recomendacoes": ["string - lista de recomendações para o caso"]
}

IMPORTANTE:
- Seja objetivo e técnico
- Fundamente em legislação
- Identifique TODOS os riscos de indeferimento
- Não invente informações que não estão nos dados fornecidos`;

interface DadosEntrada {
  categoria_segurada: string;
  data_evento: string;
  tipo_evento: string;
  data_ultima_contribuicao?: string;
  quantidade_contribuicoes?: number;
  vinculos_ativos?: string[];
  vinculos_inativos?: string[];
  gaps_contribuicao?: string[];
  documentos_anexados?: string[];
  observacoes_adicionais?: string;
  dados_cnis?: string;
}

interface RequestBody {
  mae_id: string;
  dados_entrada: DadosEntrada;
  motivo_reanalise?: string;
  observacao_reanalise?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { mae_id, dados_entrada, motivo_reanalise, observacao_reanalise } = body;

    if (!mae_id || !dados_entrada) {
      return new Response(
        JSON.stringify({ error: "mae_id e dados_entrada são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PRE-ANALISE] Iniciando análise para mae_id: ${mae_id}`);

    // Get next version number
    const { data: versionData } = await supabase
      .rpc("get_next_analise_version", { p_mae_id: mae_id });
    
    const versao = versionData || 1;
    console.log(`[PRE-ANALISE] Versão da análise: ${versao}`);

    // Format dados for AI
    const dadosFormatados = `
DADOS DA SEGURADA PARA ANÁLISE:

1. CATEGORIA PREVIDENCIÁRIA: ${dados_entrada.categoria_segurada}

2. EVENTO:
- Tipo: ${dados_entrada.tipo_evento}
- Data do evento: ${dados_entrada.data_evento}

3. CONTRIBUIÇÕES:
- Última contribuição: ${dados_entrada.data_ultima_contribuicao || "Não informado"}
- Quantidade de contribuições: ${dados_entrada.quantidade_contribuicoes || "Não informado"}

4. VÍNCULOS:
- Ativos: ${dados_entrada.vinculos_ativos?.join(", ") || "Nenhum"}
- Inativos: ${dados_entrada.vinculos_inativos?.join(", ") || "Nenhum"}

5. GAPS DE CONTRIBUIÇÃO: ${dados_entrada.gaps_contribuicao?.join(", ") || "Nenhum identificado"}

6. DOCUMENTOS ANEXADOS: ${dados_entrada.documentos_anexados?.join(", ") || "Não informados"}

7. DADOS DO CNIS:
${dados_entrada.dados_cnis || "Não fornecido"}

8. OBSERVAÇÕES ADICIONAIS:
${dados_entrada.observacoes_adicionais || "Nenhuma"}
`;

    console.log(`[PRE-ANALISE] Chamando Lovable AI Gateway...`);

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: PROMPT_ANALISE_ELEGIBILIDADE,
          },
          {
            role: "user",
            content: dadosFormatados,
          },
        ],
        temperature: 0.1, // Baixa temperatura para respostas mais determinísticas
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[PRE-ANALISE] Erro na API: ${errorText}`);
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log(`[PRE-ANALISE] Resposta recebida da IA`);

    const tokensUtilizados = aiData.usage?.total_tokens || 0;
    const respostaContent = aiData.choices?.[0]?.message?.content;

    if (!respostaContent) {
      throw new Error("Resposta vazia da IA");
    }

    // Parse AI response
    let analiseResult;
    try {
      analiseResult = JSON.parse(respostaContent);
    } catch (e) {
      console.error(`[PRE-ANALISE] Erro ao parsear resposta: ${respostaContent}`);
      throw new Error("Resposta da IA em formato inválido");
    }

    // Map conclusion to enum
    const statusMap: Record<string, string> = {
      "aprovada": "aprovada",
      "aprovada_com_ressalvas": "aprovada_com_ressalvas",
      "nao_aprovavel": "nao_aprovavel",
    };
    
    const statusAnalise = statusMap[analiseResult.conclusao] || "erro_processamento";

    // Save to database
    const { data: insertData, error: insertError } = await supabase
      .from("pre_analise")
      .insert({
        mae_id,
        user_id: user.id,
        dados_entrada,
        status_analise: statusAnalise,
        categoria_identificada: analiseResult.categoria_identificada,
        carencia_status: analiseResult.carencia_status,
        periodo_graca_status: analiseResult.periodo_graca_status,
        situacao_cnis: analiseResult.situacao_cnis,
        riscos_identificados: analiseResult.riscos_identificados || [],
        conclusao_detalhada: analiseResult.conclusao_detalhada,
        recomendacoes: analiseResult.recomendacoes || [],
        versao,
        motivo_reanalise: versao === 1 ? "primeiro_registro" : (motivo_reanalise || "solicitacao_manual"),
        observacao_reanalise,
        resposta_ia_raw: aiData,
        modelo_ia_utilizado: "google/gemini-2.5-flash",
        tokens_utilizados: tokensUtilizados,
        processado_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[PRE-ANALISE] Erro ao salvar: ${insertError.message}`);
      throw new Error(`Erro ao salvar análise: ${insertError.message}`);
    }

    console.log(`[PRE-ANALISE] Análise salva com sucesso: ${insertData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        analise: insertData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`[PRE-ANALISE] Erro: ${errorMessage}`);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
