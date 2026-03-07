import { supabase } from "@/integrations/supabase/client";

const PERCENTUAL_COMISSAO = 10;

/**
 * Calculates commission (10%) and creates a despesa entry scheduled for day 5 of next month.
 * Also updates parcela's valor_comissao.
 */
export async function processarComissaoParcela({
  parcelaId,
  valorParcela,
  userId,
  maeNome,
  numeroParcela,
}: {
  parcelaId: string;
  valorParcela: number;
  userId: string;
  maeNome: string;
  numeroParcela: number;
}) {
  if (!valorParcela || valorParcela <= 0) return null;

  const valorComissao = Math.round(valorParcela * PERCENTUAL_COMISSAO) / 100;

  // Calculate day 5 of next month
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5);
  const dataVencimento = nextMonth.toISOString().split("T")[0];

  // Fetch seller name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  const vendedorNome = profile?.full_name || "Vendedor";

  // Update parcela with commission value
  await supabase
    .from("parcelas_pagamento")
    .update({ valor_comissao: valorComissao } as any)
    .eq("id", parcelaId);

  // Check if despesa already exists for this parcela (avoid duplicates)
  const { data: existing } = await supabase
    .from("despesas")
    .select("id")
    .eq("parcela_origem_id" as any, parcelaId)
    .limit(1);

  if (existing && existing.length > 0) {
    return valorComissao; // Already exists, just return
  }

  // Create despesa entry
  const { error } = await supabase.from("despesas").insert({
    user_id: userId,
    categoria: "comissao_parceiro",
    descricao: `Comissão ${PERCENTUAL_COMISSAO}% — ${maeNome} (${numeroParcela}ª parcela)`,
    valor: valorComissao,
    data_vencimento: dataVencimento,
    status: "pendente",
    recorrencia: "unica",
    fornecedor: vendedorNome,
    observacoes: `Comissão automática de ${PERCENTUAL_COMISSAO}% sobre parcela #${numeroParcela} (R$ ${valorParcela.toFixed(2)}) — ${maeNome}`,
    parcela_origem_id: parcelaId,
  } as any);

  if (error) {
    console.error("Erro ao criar despesa de comissão:", error);
    throw error;
  }

  return valorComissao;
}
