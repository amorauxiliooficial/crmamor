import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CentralFinanceira {
  id: string;
  mae_id: string;
  numero_beneficio: string | null;
  banco_saque: string | null;
  agencia_saque: string | null;
  endereco_saque: string | null;
  data_saque: string | null;
  horario_saque: string | null;
  observacao_saque: string | null;
  percentual_honorarios: number | null;
  taxa_administrativa: number | null;
  valor_previsto_beneficio: number | null;
  valor_receber_cliente: number | null;
  observacoes_valores_futuros: string | null;
}

export interface ParcelaBeneficio {
  id: string;
  central_id: string;
  numero_parcela: number;
  valor: number | null;
  data_parcela: string | null;
  status: "liberada" | "prevista" | "recebida" | "a_confirmar";
}

export interface BoletoAmor {
  id: string;
  central_id: string;
  numero_boleto: string | null;
  valor: number | null;
  vencimento: string | null;
  status: "a_emitir" | "enviado" | "pago" | "vencido" | "cancelado";
  observacoes: string | null;
}

export interface ParcelaRecebimento {
  id: string;
  central_id: string;
  mae_id: string;
  numero_parcela: number;
  valor: number | null;
  data_prevista: string | null;
  status: "prevista" | "liberada" | "recebida" | "atrasada" | "cancelada";
  observacoes: string | null;
}

export interface ComunicadoHistorico {
  id: string;
  central_id: string;
  user_id: string | null;
  texto: string;
  valores_snapshot: any;
  created_at: string;
}

async function ensureCentral(maeId: string): Promise<CentralFinanceira> {
  const { data: existing } = await supabase
    .from("central_financeira" as any)
    .select("*")
    .eq("mae_id", maeId)
    .maybeSingle();
  if (existing) return existing as any;

  const { data: created, error } = await supabase
    .from("central_financeira" as any)
    .insert({ mae_id: maeId })
    .select()
    .single();
  if (error) throw error;
  return created as any;
}

export function useCentralFinanceira(maeId: string | null) {
  const qc = useQueryClient();

  const centralQuery = useQuery({
    queryKey: ["central-financeira", maeId],
    queryFn: () => ensureCentral(maeId!),
    enabled: !!maeId,
  });

  const centralId = centralQuery.data?.id ?? null;

  const parcelasQuery = useQuery({
    queryKey: ["central-parcelas", centralId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelas_beneficio" as any)
        .select("*")
        .eq("central_id", centralId!)
        .order("numero_parcela");
      if (error) throw error;
      return (data as any) as ParcelaBeneficio[];
    },
    enabled: !!centralId,
  });

  const boletosQuery = useQuery({
    queryKey: ["central-boletos", centralId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boletos_amor" as any)
        .select("*")
        .eq("central_id", centralId!)
        .order("vencimento", { nullsFirst: false });
      if (error) throw error;
      return (data as any) as BoletoAmor[];
    },
    enabled: !!centralId,
  });

  const historicoQuery = useQuery({
    queryKey: ["central-historico", centralId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("central_comunicados_historico" as any)
        .select("*")
        .eq("central_id", centralId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) as ComunicadoHistorico[];
    },
    enabled: !!centralId,
  });

  const logAlteracao = async (entidade: string, campo: string, valor_anterior: any, valor_novo: any) => {
    if (!centralId || !maeId) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("central_alteracoes_log" as any).insert({
      central_id: centralId,
      mae_id: maeId,
      user_id: user?.id ?? null,
      entidade,
      campo,
      valor_anterior: valor_anterior == null ? null : String(valor_anterior),
      valor_novo: valor_novo == null ? null : String(valor_novo),
    });
  };

  const updateCentral = useMutation({
    mutationFn: async (patch: Partial<CentralFinanceira>) => {
      if (!centralId) throw new Error("sem central");
      const prev = centralQuery.data!;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("central_financeira" as any)
        .update({ ...patch, updated_by: user?.id ?? null })
        .eq("id", centralId)
        .select()
        .single();
      if (error) throw error;
      for (const k of Object.keys(patch)) {
        const before = (prev as any)[k];
        const after = (patch as any)[k];
        if (String(before ?? "") !== String(after ?? "")) {
          await logAlteracao("central_financeira", k, before, after);
        }
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["central-financeira", maeId] }),
  });

  const upsertParcela = useMutation({
    mutationFn: async (p: Partial<ParcelaBeneficio> & { numero_parcela: number }) => {
      if (!centralId) throw new Error("sem central");
      const { data, error } = await supabase
        .from("parcelas_beneficio" as any)
        .upsert(
          { central_id: centralId, ...p },
          { onConflict: "central_id,numero_parcela" }
        )
        .select()
        .single();
      if (error) throw error;
      await logAlteracao("parcela", `parcela_${p.numero_parcela}`, null, JSON.stringify(p));
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["central-parcelas", centralId] }),
  });

  const deleteParcela = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parcelas_beneficio" as any).delete().eq("id", id);
      if (error) throw error;
      await logAlteracao("parcela", "delete", id, null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["central-parcelas", centralId] }),
  });

  const upsertBoleto = useMutation({
    mutationFn: async (b: Partial<BoletoAmor> & { id?: string }) => {
      if (!centralId) throw new Error("sem central");
      if (b.id) {
        const { data, error } = await supabase
          .from("boletos_amor" as any)
          .update(b)
          .eq("id", b.id)
          .select()
          .single();
        if (error) throw error;
        await logAlteracao("boleto", b.id, null, JSON.stringify(b));
        return data;
      }
      const { data, error } = await supabase
        .from("boletos_amor" as any)
        .insert({ central_id: centralId, ...b })
        .select()
        .single();
      if (error) throw error;
      await logAlteracao("boleto", "novo", null, JSON.stringify(b));
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["central-boletos", centralId] }),
  });

  const deleteBoleto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boletos_amor" as any).delete().eq("id", id);
      if (error) throw error;
      await logAlteracao("boleto", "delete", id, null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["central-boletos", centralId] }),
  });

  const recebimentosQuery = useQuery({
    queryKey: ["central-recebimentos", centralId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelas_recebimento_cliente" as any)
        .select("*")
        .eq("central_id", centralId!)
        .order("numero_parcela");
      if (error) throw error;
      return (data as any) as ParcelaRecebimento[];
    },
    enabled: !!centralId,
  });

  const upsertRecebimento = useMutation({
    mutationFn: async (r: Partial<ParcelaRecebimento> & { id?: string }) => {
      if (!centralId || !maeId) throw new Error("sem central");
      if (r.id) {
        const { data, error } = await supabase
          .from("parcelas_recebimento_cliente" as any)
          .update(r)
          .eq("id", r.id)
          .select()
          .single();
        if (error) throw error;
        await logAlteracao("recebimento", r.id, null, JSON.stringify(r));
        return data;
      }
      const { data, error } = await supabase
        .from("parcelas_recebimento_cliente" as any)
        .insert({ central_id: centralId, mae_id: maeId, ...r })
        .select()
        .single();
      if (error) throw error;
      await logAlteracao("recebimento", "novo", null, JSON.stringify(r));
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["central-recebimentos", centralId] }),
  });

  const deleteRecebimento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parcelas_recebimento_cliente" as any).delete().eq("id", id);
      if (error) throw error;
      await logAlteracao("recebimento", "delete", id, null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["central-recebimentos", centralId] }),
  });

  const salvarComunicado = useMutation({
    mutationFn: async ({ texto, snapshot }: { texto: string; snapshot: any }) => {
      if (!centralId || !maeId) throw new Error("sem central");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("central_comunicados_historico" as any).insert({
        central_id: centralId,
        mae_id: maeId,
        user_id: user?.id ?? null,
        texto,
        valores_snapshot: snapshot,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["central-historico", centralId] }),
  });

  return {
    central: centralQuery.data,
    parcelas: parcelasQuery.data ?? [],
    boletos: boletosQuery.data ?? [],
    historico: historicoQuery.data ?? [],
    isLoading: centralQuery.isLoading || parcelasQuery.isLoading || boletosQuery.isLoading,
    updateCentral,
    upsertParcela,
    deleteParcela,
    upsertBoleto,
    deleteBoleto,
    salvarComunicado,
  };
}
