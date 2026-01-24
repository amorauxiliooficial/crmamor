import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PreAnalise, DadosEntradaAnalise, MotivoReanalise, RiscoIdentificado } from "@/types/preAnalise";

// Helper to safely cast database response to PreAnalise
const mapDbToPreAnalise = (row: unknown): PreAnalise => {
  const data = row as Record<string, unknown>;
  return {
    id: data.id as string,
    mae_id: data.mae_id as string,
    user_id: data.user_id as string,
    dados_entrada: data.dados_entrada as DadosEntradaAnalise,
    status_analise: data.status_analise as PreAnalise["status_analise"],
    categoria_identificada: data.categoria_identificada as string | undefined,
    carencia_status: data.carencia_status as string | undefined,
    periodo_graca_status: data.periodo_graca_status as string | undefined,
    situacao_cnis: data.situacao_cnis as string | undefined,
    riscos_identificados: (data.riscos_identificados || []) as RiscoIdentificado[],
    conclusao_detalhada: data.conclusao_detalhada as string | undefined,
    recomendacoes: (data.recomendacoes || []) as string[],
    versao: data.versao as number,
    motivo_reanalise: data.motivo_reanalise as PreAnalise["motivo_reanalise"],
    observacao_reanalise: data.observacao_reanalise as string | undefined,
    resposta_ia_raw: data.resposta_ia_raw,
    modelo_ia_utilizado: data.modelo_ia_utilizado as string | undefined,
    tokens_utilizados: data.tokens_utilizados as number | undefined,
    created_at: data.created_at as string,
    processado_em: data.processado_em as string | undefined,
  };
};

export function usePreAnalise() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const executarAnalise = async (
    maeId: string,
    dadosEntrada: DadosEntradaAnalise,
    motivoReanalise?: MotivoReanalise,
    observacaoReanalise?: string
  ): Promise<PreAnalise | null> => {
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para executar a análise.",
          variant: "destructive",
        });
        return null;
      }

      const response = await supabase.functions.invoke("pre-analise-elegibilidade", {
        body: {
          mae_id: maeId,
          dados_entrada: dadosEntrada,
          motivo_reanalise: motivoReanalise,
          observacao_reanalise: observacaoReanalise,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao executar análise");
      }

      const result = response.data;

      if (!result.success) {
        throw new Error(result.error || "Erro desconhecido na análise");
      }

      toast({
        title: "Análise concluída",
        description: `Resultado: ${result.analise.status_analise.replace(/_/g, " ")}`,
      });

      return result.analise as PreAnalise;
    } catch (error) {
      console.error("Erro na pré-análise:", error);
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const buscarHistoricoAnalises = async (maeId: string): Promise<PreAnalise[]> => {
    try {
      const { data, error } = await supabase
        .from("pre_analise")
        .select("*")
        .eq("mae_id", maeId)
        .order("versao", { ascending: false });

      if (error) {
        console.error("Erro ao buscar histórico:", error);
        return [];
      }

      return (data || []).map(mapDbToPreAnalise);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      return [];
    }
  };

  const buscarUltimaAnalise = async (maeId: string): Promise<PreAnalise | null> => {
    try {
      const { data, error } = await supabase
        .from("pre_analise")
        .select("*")
        .eq("mae_id", maeId)
        .order("versao", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar última análise:", error);
        return null;
      }

      return data ? mapDbToPreAnalise(data) : null;
    } catch (error) {
      console.error("Erro ao buscar última análise:", error);
      return null;
    }
  };

  return {
    isLoading,
    executarAnalise,
    buscarHistoricoAnalises,
    buscarUltimaAnalise,
  };
}
