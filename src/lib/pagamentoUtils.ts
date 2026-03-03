import { parseISO, isBefore, startOfDay } from "date-fns";

export type StatusGeral = "vinculo_pendente" | "pago" | "inadimplente" | "pendente";

export interface ParcelaResumo {
  id: string;
  numero_parcela: number;
  valor: number | null;
  valor_comissao?: number | null;
  data_pagamento: string | null;
  status: string;
  observacoes: string | null;
}

export function calcularStatusGeral(
  maeNome: string | undefined | null,
  parcelas: ParcelaResumo[]
): StatusGeral {
  // No mae linked
  if (!maeNome || maeNome === "N/A") return "vinculo_pendente";

  if (parcelas.length === 0) return "pendente";

  const todasPagas = parcelas.every((p) => p.status === "pago");
  if (todasPagas) return "pago";

  const temInadimplente = parcelas.some((p) => p.status === "inadimplente");
  if (temInadimplente) return "inadimplente";

  // Check if any "pendente" parcela has past due date
  const hoje = startOfDay(new Date());
  const temVencida = parcelas.some((p) => {
    if (p.status !== "pendente" || !p.data_pagamento) return false;
    try {
      return isBefore(parseISO(p.data_pagamento), hoje);
    } catch {
      return false;
    }
  });
  if (temVencida) return "inadimplente";

  return "pendente";
}

export function getProximoVencimento(parcelas: ParcelaResumo[]): string | null {
  const abertas = parcelas
    .filter((p) => p.status !== "pago" && p.data_pagamento)
    .sort((a, b) => {
      try {
        return parseISO(a.data_pagamento!).getTime() - parseISO(b.data_pagamento!).getTime();
      } catch {
        return 0;
      }
    });
  return abertas[0]?.data_pagamento || null;
}

export function getStatusGeralOrder(status: StatusGeral): number {
  switch (status) {
    case "vinculo_pendente": return 0;
    case "inadimplente": return 1;
    case "pendente": return 2;
    case "pago": return 3;
    default: return 4;
  }
}
