import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Atividade, TipoAtividade, ConfigPrazoStatus } from "@/types/atividade";
import { useToast } from "@/hooks/use-toast";

export function useAtividades(maeId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAtividades = useCallback(async () => {
    if (!maeId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("atividades_mae")
      .select("*")
      .eq("mae_id", maeId)
      .order("data_atividade", { ascending: false });

    if (error) {
      console.error("Erro ao carregar atividades:", error);
    } else if (data) {
      setAtividades(data as Atividade[]);
    }
    setLoading(false);
  }, [maeId]);

  useEffect(() => {
    fetchAtividades();
  }, [fetchAtividades]);

  const addAtividade = async (
    maeId: string,
    tipoAtividade: TipoAtividade,
    descricao?: string
  ) => {
    if (!user) return { success: false };

    const { error } = await supabase.from("atividades_mae").insert({
      mae_id: maeId,
      user_id: user.id,
      tipo_atividade: tipoAtividade,
      descricao: descricao || null,
    });

    if (error) {
      console.error("Erro ao registrar atividade:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar a atividade.",
      });
      return { success: false };
    }

    toast({
      title: "Atividade registrada",
      description: "Follow-up salvo com sucesso!",
    });
    
    fetchAtividades();
    return { success: true };
  };

  return { atividades, loading, addAtividade, refetch: fetchAtividades };
}

// Fetch config with React Query for caching
async function fetchConfigPrazos(): Promise<ConfigPrazoStatus[]> {
  const { data, error } = await supabase
    .from("config_prazos_status")
    .select("*");

  if (error) throw error;
  return (data || []) as ConfigPrazoStatus[];
}

export function useConfigPrazos() {
  const query = useQuery({
    queryKey: ["config_prazos_status"],
    queryFn: fetchConfigPrazos,
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos no cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const config = query.data || [];

  const getPrazoForStatus = (statusProcesso: string): number => {
    // Remove emoji prefix if present
    const cleanStatus = statusProcesso.replace(/^[\p{Emoji}\s]+/u, "").trim();
    const found = config.find((c) => c.status_processo === cleanStatus);
    return found?.dias_limite ?? 3; // Default 3 days
  };

  return { config, loading: query.isLoading, getPrazoForStatus };
}

export function useFollowUpStatus() {
  const { config, getPrazoForStatus, loading: configLoading } = useConfigPrazos();

  /**
   * Calcula o status de urgência do follow-up
   * @returns "ok" | "warning" | "overdue" | "no-activity"
   */
  const getFollowUpStatus = (
    ultimaAtividadeEm: string | null | undefined,
    statusProcesso: string,
    createdAt: string
  ): "ok" | "warning" | "overdue" | "no-activity" => {
    // Se não há atividades, usa a data de criação como referência
    const referenceDate = ultimaAtividadeEm || createdAt;
    
    if (!referenceDate) return "no-activity";

    const diasLimite = getPrazoForStatus(statusProcesso);
    const lastDate = new Date(referenceDate);
    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Sem atividade registrada ainda
    if (!ultimaAtividadeEm) {
      if (diffDays >= diasLimite) return "overdue";
      if (diffDays >= diasLimite - 1) return "warning";
      return "no-activity";
    }

    // Com atividade
    if (diffDays >= diasLimite) return "overdue";
    if (diffDays >= diasLimite - 1) return "warning";
    return "ok";
  };

  /**
   * Retorna quantos dias desde a última interação
   */
  const getDaysSinceLastActivity = (
    ultimaAtividadeEm: string | null | undefined,
    createdAt: string
  ): number => {
    const referenceDate = ultimaAtividadeEm || createdAt;
    if (!referenceDate) return 0;

    const lastDate = new Date(referenceDate);
    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  return { 
    getFollowUpStatus, 
    getDaysSinceLastActivity, 
    getPrazoForStatus,
    configLoading 
  };
}
