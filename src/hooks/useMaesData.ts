import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MaeProcesso, StatusProcesso } from "@/types/mae";

// Extended MaeProcesso with activity data
export interface MaeProcessoComAtividade extends MaeProcesso {
  ultima_atividade_em?: string | null;
}

// Map database status to display status with emoji
export const mapDbStatusToDisplay = (status: string): StatusProcesso => {
  const statusMap: Record<string, StatusProcesso> = {
    "Pendência Documental": "⚠️ Pendência Documental",
    "Elegível (Análise Positiva)": "🟡 Elegível (Análise Positiva)",
    "Aguardando Análise INSS": "⏳ Aguardando Análise INSS",
    "Aprovada": "✅ Aprovada",
    "Indeferida": "❌ Indeferida",
    "Recurso / Judicial": "⚖️ Recurso / Judicial",
    "Inadimplência": "💳 Inadimplência",
    "Rescisão de Contrato": "📄 Rescisão de Contrato",
    "📄 Rescisão de Contrato": "📄 Rescisão de Contrato",
    "Processo Encerrado": "📦 Processo Encerrado",
  };
  return statusMap[status] || ("⚠️ Pendência Documental" as StatusProcesso);
};

// Map a single database item to MaeProcessoComAtividade
const mapDbToMae = (item: Record<string, unknown>): MaeProcessoComAtividade => ({
  id: item.id as string,
  user_id: item.user_id as string,
  nome_mae: item.nome_mae as string,
  cpf: item.cpf as string,
  telefone: (item.telefone as string) || undefined,
  email: (item.email as string) || undefined,
  tipo_evento: item.tipo_evento as MaeProcesso["tipo_evento"],
  data_evento: (item.data_evento as string) || undefined,
  data_evento_tipo: ((item.data_evento_tipo as string) || "") as MaeProcesso["data_evento_tipo"],
  categoria_previdenciaria: item.categoria_previdenciaria as MaeProcesso["categoria_previdenciaria"],
  status_processo: mapDbStatusToDisplay(item.status_processo as string),
  protocolo_inss: (item.protocolo_inss as string) || undefined,
  parcelas: (item.parcelas as string) || undefined,
  contrato_assinado: item.contrato_assinado as boolean,
  segurada: (item.segurada as string) || undefined,
  precisa_gps: (item.precisa_gps as string) || undefined,
  uf: (item.uf as string) || undefined,
  observacoes: (item.observacoes as string) || undefined,
  origem: (item.origem as string) || undefined,
  senha_gov: (item.senha_gov as string) || undefined,
  verificacao_duas_etapas: (item.verificacao_duas_etapas as boolean) ?? false,
  is_gestante: (item.is_gestante as boolean) ?? false,
  mes_gestacao: (item.mes_gestacao as number) ?? null,
  data_ultima_atualizacao: item.data_ultima_atualizacao as string,
  link_documentos: (item.link_documentos as string) || null,
  ultima_atividade_em: (item.ultima_atividade_em as string) || null,
  precisa_das: (item.precisa_das as boolean) ?? false,
  das_concluido: (item.das_concluido as boolean) ?? false,
});

interface MaesDataResult {
  maes: MaeProcessoComAtividade[];
  rawData: { id: string; user_id: string }[];
}

// Optimized fetch with parallel queries
async function fetchMaesData(): Promise<MaesDataResult> {
  const { data, error } = await supabase
    .from("mae_processo")
    .select("*")
    .order("data_ultima_atualizacao", { ascending: false });

  if (error) throw error;

  const rawData = (data || []).map((item) => ({ id: item.id, user_id: item.user_id }));
  const maes = (data || []).map((item) => mapDbToMae(item as Record<string, unknown>));

  return { maes, rawData };
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

async function fetchUsersData(): Promise<UserProfile[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name", { ascending: true, nullsFirst: false });
  
  return data || [];
}

async function fetchAlertasNaoLidos(userId: string): Promise<Set<string>> {
  const { data: alertas } = await supabase
    .from("alertas_mae")
    .select("mae_id")
    .eq("lido", false)
    .or(`destinatario_id.eq.${userId},destinatario_id.is.null`);
  
  return new Set(alertas?.map(a => a.mae_id) || []);
}

export function useMaesData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch maes data with cache
  const maesQuery = useQuery({
    queryKey: ["maes_data"],
    queryFn: fetchMaesData,
    enabled: !!user,
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch users with cache
  const usersQuery = useQuery({
    queryKey: ["profiles_list"],
    queryFn: fetchUsersData,
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch alertas with cache
  const alertasQuery = useQuery({
    queryKey: ["alertas_nao_lidos", user?.id],
    queryFn: () => fetchAlertasNaoLidos(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Real-time subscription for maes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("maes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mae_processo" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["maes_data"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alertas_mae" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["alertas_nao_lidos"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["maes_data"] });
  };

  const refetchAlertas = () => {
    queryClient.invalidateQueries({ queryKey: ["alertas_nao_lidos"] });
  };

  const refreshSingleMae = async (maeId: string) => {
    const { data, error } = await supabase
      .from("mae_processo")
      .select("*")
      .eq("id", maeId)
      .single();

    if (error) {
      refetch();
      return null;
    }

    if (data) {
      const updatedMae = mapDbToMae(data as Record<string, unknown>);
      
      // Update cache directly
      queryClient.setQueryData(["maes_data"], (old: MaesDataResult | undefined) => {
        if (!old) return old;
        return {
          ...old,
          maes: old.maes.map((m) => (m.id === maeId ? updatedMae : m)),
        };
      });

      return updatedMae;
    }

    return null;
  };

  return {
    maes: maesQuery.data?.maes || [],
    allMaesRaw: maesQuery.data?.rawData || [],
    users: usersQuery.data || [],
    alertasNaoLidos: alertasQuery.data || new Set<string>(),
    loading: maesQuery.isLoading || usersQuery.isLoading,
    isFetching: maesQuery.isFetching,
    refetch,
    refetchAlertas,
    refreshSingleMae,
  };
}
