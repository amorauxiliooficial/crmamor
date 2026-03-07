import { supabase } from "@/integrations/supabase/client";

const PERCENTUAL_COMISSAO_PADRAO = 10;

/**
 * Calculates commission and creates a despesa entry scheduled for day 5 of next month.
 * Also updates parcela's valor_comissao.
 */
export async function processarComissaoParcela({
  parcelaId,
  valorParcela,
  userId,
  maeNome,
  numeroParcela,
  percentualComissao,
  fornecedorId,
  fornecedorNome,
}: {
  parcelaId: string;
  valorParcela: number;
  userId: string;
  maeNome: string;
  numeroParcela: number;
  percentualComissao?: number;
  fornecedorId?: string | null;
  fornecedorNome?: string | null;
}) {
  if (!valorParcela || valorParcela <= 0) return null;

  const percentual = percentualComissao ?? PERCENTUAL_COMISSAO_PADRAO;
  const valorComissao = Math.round(valorParcela * percentual) / 100;

  // Calculate day 5 of current month (or next month if we're past day 5)
  const now = new Date();
  const day5ThisMonth = new Date(now.getFullYear(), now.getMonth(), 5);
  const target = now.getDate() > 5 ? new Date(now.getFullYear(), now.getMonth() + 1, 5) : day5ThisMonth;
  const dataVencimento = target.toISOString().split("T")[0];

  // Resolve fornecedor name if not provided
  let nomeFornecedor = fornecedorNome;
  if (!nomeFornecedor && fornecedorId) {
    const { data: forn } = await supabase
      .from("fornecedores")
      .select("nome")
      .eq("id", fornecedorId)
      .single();
    nomeFornecedor = forn?.nome || null;
  }
  if (!nomeFornecedor) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();
    nomeFornecedor = profile?.full_name || "Vendedor";
  }

  // Update parcela with commission value
  await supabase
    .from("parcelas_pagamento")
    .update({ valor_comissao: valorComissao } as any)
    .eq("id", parcelaId);

  // Check if despesa already exists for this parcela (avoid duplicates)
  const { data: existing } = await supabase
    .from("despesas")
    .select("id")
    .eq("parcela_origem_id", parcelaId as any)
    .limit(1);

  if (existing && existing.length > 0) {
    return valorComissao;
  }

  // Create despesa entry
  const { error } = await supabase.from("despesas").insert({
    user_id: userId,
    categoria: "comissao_parceiro",
    descricao: `Comissão ${percentual}% — ${maeNome} (${numeroParcela}ª parcela)`,
    valor: valorComissao,
    data_vencimento: dataVencimento,
    status: "pendente",
    recorrencia: "unica",
    fornecedor: nomeFornecedor,
    fornecedor_id: fornecedorId || null,
    observacoes: `Comissão automática de ${percentual}% sobre parcela #${numeroParcela} (R$ ${valorParcela.toFixed(2)}) — ${maeNome}`,
    parcela_origem_id: parcelaId,
  } as any);

  if (error) {
    console.error("Erro ao criar despesa de comissão:", error);
    throw error;
  }

  return valorComissao;
}
