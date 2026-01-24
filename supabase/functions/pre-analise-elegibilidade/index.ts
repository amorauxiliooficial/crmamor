import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prompt jurídico fixo - NÃO EDITÁVEL por usuários (apenas admin no código)
const PROMPT_ANALISE_ELEGIBILIDADE = `Você é um especialista jurídico em direito previdenciário brasileiro, especializado em análise de elegibilidade para salário-maternidade.

TAREFA: Analise os dados fornecidos e determine a elegibilidade da segurada para o benefício de salário-maternidade com base na legislação vigente (Lei 8.213/91, Decreto 3.048/99 e IN INSS 128/2022).

REGRAS DE ANÁLISE:

1. CATEGORIA E CARÊNCIA:
- Empregada CLT: Sem carência (dispensa de carência)
- Contribuinte Individual: 10 contribuições mensais
- MEI: 10 contribuições mensais  
- Facultativa: 10 contribuições mensais
- Segurada Especial (Rural): 10 meses de atividade rural comprovada
- Desempregada: Verificar período de graça + carência anterior

2. PERÍODO DE GRAÇA (Art. 15, Lei 8.213/91):
- 12 meses após última contribuição (regra geral)
- 24 meses se mais de 120 contribuições (teve_120_contribuicoes = true)
- +12 meses se recebeu seguro-desemprego (recebeu_seguro_desemprego = true)
- Máximo: 36 meses

3. MEI:
- Se mei_ativo = true e competencias_em_atraso = true → ALERTA
- MEI precisa estar em dia para manter qualidade de segurada

4. PRAZOS LEGAIS:
- Pode requerer até 5 anos após o parto/adoção
- Início do benefício: data do parto ou 28 dias antes (se gestante)

5. DOCUMENTAÇÃO MÍNIMA:
- CNIS obrigatório
- Certidão de nascimento/adoção obrigatório
- CTPS recomendado para empregadas
- Comprovante de endereço para correspondência

VOCÊ DEVE RESPONDER EXCLUSIVAMENTE NO FORMATO JSON ABAIXO:

{
  "status": "APROVADA|APROVADA_COM_RESSALVAS|NAO_APROVAVEL",
  "categoria_identificada": "string - categoria previdenciária identificada",
  "carencia": {
    "exigida": true,
    "regra": "string - qual regra de carência se aplica",
    "cumprida": true,
    "detalhe": "string - explicação sobre carência"
  },
  "periodo_de_graca": {
    "regra": "string - qual regra de período de graça",
    "data_limite": "YYYY-MM-DD",
    "dentro": true,
    "detalhe": "string - explicação"
  },
  "cnis": {
    "ok": true,
    "pontos_de_atencao": ["lista de pontos que merecem atenção no CNIS"]
  },
  "riscos": [
    { "nivel": "ALERTA|BLOQUEIO", "motivo": "string - descrição do risco" }
  ],
  "conclusao": "string - conclusão detalhada e fundamentada",
  "checklist_documentos": [
    { "doc": "CNIS", "status": "OK|FALTA" },
    { "doc": "CTPS", "status": "OK|FALTA" },
    { "doc": "CERTIDAO", "status": "OK|FALTA" },
    { "doc": "COMPROVANTE_ENDERECO", "status": "OK|FALTA" }
  ],
  "resultado_atendente": {
    "resultado": "APROVADO|REPROVADO|JURIDICO",
    "motivo_curto": "texto curto padronizado para atendente",
    "proxima_acao": "PROTOCOLO_INSS|ENCAMINHAR_JURIDICO|SOLICITAR_DOCS"
  }
}

REGRAS PARA resultado_atendente (IMPORTANTE - atendente não interpreta regras):
- APROVADO: status APROVADA sem bloqueios, documentos essenciais OK → proxima_acao = "PROTOCOLO_INSS"
- REPROVADO: status NAO_APROVAVEL por falta de documentos básicos que podem ser obtidos → proxima_acao = "SOLICITAR_DOCS"
- JURIDICO (OBRIGATÓRIO quando):
  * Falta documento essencial que não pode ser obtido
  * Divergência de CNIS/CTPS
  * Período de graça no limite ou vencido
  * Contribuições em atraso / fora do prazo com risco
  * Caso rural com prova material fraca
  * Indeferimento anterior / necessidade de recurso
  * APROVADA_COM_RESSALVAS sempre vai para JURIDICO
  → proxima_acao = "ENCAMINHAR_JURIDICO"

O motivo_curto deve ser objetivo e padronizado (máx 50 caracteres), ex:
- "Período de graça possivelmente vencido"
- "CNIS divergente do informado"
- "Carência insuficiente"
- "Documentação incompleta - falta certidão"
- "Apto para protocolo"

IMPORTANTE:
- Seja objetivo e técnico
- Fundamente em legislação (cite artigos quando aplicável)
- Identifique TODOS os riscos de indeferimento
- BLOQUEIO = impede aprovação / ALERTA = ponto de atenção mas não impede
- Não invente informações que não estão nos dados fornecidos
- Se documentação essencial estiver faltando, marque como risco de BLOQUEIO`;

interface DadosEntrada {
  case_id?: string;
  cpf: string;
  nome: string;
  categoria: string;
  gestante: boolean;
  evento: string;
  data_evento: string;
  ultimo_vinculo_data_fim?: string;
  total_contribuicoes: number;
  teve_120_contribuicoes: boolean;
  recebeu_seguro_desemprego: boolean;
  mei_ativo: boolean;
  competencias_em_atraso: boolean;
  documentos: {
    cnis: boolean;
    ctps: boolean;
    certidao: boolean;
    comprov_endereco: boolean;
    outros: string[];
  };
  observacoes_atendente?: string;
}

interface RequestBody {
  mae_id: string | null; // Can be null for standalone analyses
  dados_entrada: DadosEntrada;
  motivo_reanalise?: string;
  observacao_reanalise?: string;
  session_id?: string; // For standalone analyses
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
    const { mae_id, dados_entrada, motivo_reanalise, observacao_reanalise, session_id } = body;

    // Validate: need either mae_id or session_id for standalone analysis
    if (!dados_entrada) {
      return new Response(
        JSON.stringify({ error: "dados_entrada é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Standalone analysis (no mae_id) - just process and return result, don't save
    const isStandalone = !mae_id;
    
    console.log(`[PRE-ANALISE] Iniciando análise ${isStandalone ? 'avulsa (standalone)' : `para mae_id: ${mae_id}`}`);

    let versao = 1;
    if (!isStandalone) {
      // Get next version number only for non-standalone
      const { data: versionData } = await supabase
        .rpc("get_next_analise_version", { p_mae_id: mae_id });
      versao = versionData || 1;
      console.log(`[PRE-ANALISE] Versão da análise: ${versao}`);
    }

    // Format dados for AI - JSON estruturado conforme contrato
    const dadosFormatados = JSON.stringify({
      case_id: mae_id,
      cpf: dados_entrada.cpf,
      nome: dados_entrada.nome,
      categoria: dados_entrada.categoria,
      gestante: dados_entrada.gestante,
      evento: dados_entrada.evento,
      data_evento: dados_entrada.data_evento,
      ultimo_vinculo_data_fim: dados_entrada.ultimo_vinculo_data_fim || null,
      total_contribuicoes: dados_entrada.total_contribuicoes,
      teve_120_contribuicoes: dados_entrada.teve_120_contribuicoes,
      recebeu_seguro_desemprego: dados_entrada.recebeu_seguro_desemprego,
      mei_ativo: dados_entrada.mei_ativo,
      competencias_em_atraso: dados_entrada.competencias_em_atraso,
      documentos: dados_entrada.documentos,
      observacoes_atendente: dados_entrada.observacoes_atendente || ""
    }, null, 2);

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
            content: `Analise o seguinte caso e retorne APENAS o JSON de resposta conforme o formato especificado:\n\n${dadosFormatados}`,
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

    // Validate status
    const validStatuses = ["APROVADA", "APROVADA_COM_RESSALVAS", "NAO_APROVAVEL"];
    const statusAnalise = validStatuses.includes(analiseResult.status) 
      ? analiseResult.status 
      : "ERRO_PROCESSAMENTO";

    // Extract simplified result for atendente
    const resultadoAtendente = analiseResult.resultado_atendente || {
      resultado: statusAnalise === "APROVADA" ? "APROVADO" : 
                 statusAnalise === "NAO_APROVAVEL" ? "REPROVADO" : "JURIDICO",
      motivo_curto: statusAnalise === "APROVADA" ? "Apto para protocolo" : 
                    "Análise necessária",
      proxima_acao: statusAnalise === "APROVADA" ? "PROTOCOLO_INSS" : "ENCAMINHAR_JURIDICO"
    };

    console.log(`[PRE-ANALISE] Resultado atendente: ${JSON.stringify(resultadoAtendente)}`);

    // For standalone analyses, just return the result without saving to database
    if (isStandalone) {
      console.log(`[PRE-ANALISE] Análise avulsa concluída - não salva no banco`);
      return new Response(
        JSON.stringify({
          success: true,
          analise: {
            resultado_atendente: resultadoAtendente.resultado,
            motivo_curto: resultadoAtendente.motivo_curto,
            proxima_acao: resultadoAtendente.proxima_acao,
            resposta_estruturada: analiseResult,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save to database with simplified result columns (only for non-standalone)
    const { data: insertData, error: insertError } = await supabase
      .from("pre_analise")
      .insert({
        mae_id,
        user_id: user.id,
        dados_entrada,
        status_analise: statusAnalise.toLowerCase().replace(/_/g, "_"), // Normalize for enum
        categoria_identificada: analiseResult.categoria_identificada,
        carencia_status: JSON.stringify(analiseResult.carencia),
        periodo_graca_status: JSON.stringify(analiseResult.periodo_de_graca),
        situacao_cnis: JSON.stringify(analiseResult.cnis),
        riscos_identificados: analiseResult.riscos || [],
        conclusao_detalhada: analiseResult.conclusao,
        recomendacoes: analiseResult.checklist_documentos?.map((d: {doc: string, status: string}) => `${d.doc}: ${d.status}`) || [],
        versao,
        motivo_reanalise: versao === 1 ? "primeiro_registro" : (motivo_reanalise || "solicitacao_manual"),
        observacao_reanalise,
        resposta_ia_raw: {
          ...aiData,
          parsed_response: analiseResult
        },
        modelo_ia_utilizado: "google/gemini-2.5-flash",
        tokens_utilizados: tokensUtilizados,
        processado_em: new Date().toISOString(),
        // New simplified result columns for attendant view
        resultado_atendente: resultadoAtendente.resultado,
        motivo_curto: resultadoAtendente.motivo_curto,
        proxima_acao: resultadoAtendente.proxima_acao,
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[PRE-ANALISE] Erro ao salvar: ${insertError.message}`);
      throw new Error(`Erro ao salvar análise: ${insertError.message}`);
    }

    console.log(`[PRE-ANALISE] Análise salva com sucesso: ${insertData.id}`);

    // Return both the DB record, the structured AI response, and simplified result for atendente
    return new Response(
      JSON.stringify({
        success: true,
        analise: {
          ...insertData,
          resposta_estruturada: analiseResult,
          resultado_atendente: resultadoAtendente.resultado,
          motivo_curto: resultadoAtendente.motivo_curto,
          proxima_acao: resultadoAtendente.proxima_acao,
        },
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
