import { useMemo } from "react";
import { useMaesData } from "@/hooks/useMaesData";
import { useForecastMetas } from "@/hooks/useForecastMetas";
import { StatusProcesso } from "@/types/mae";

export const DEFAULT_TICKET_MEDIO = 1800;
export const DEFAULT_TAXA_PAGAMENTO = 0.75;

// Probabilidades por fase (sem emoji)
export const PROBABILIDADE_FASE: Record<string, number> = {
  "Gestantes 1 a 7 meses": 0.2,
  "Entradas do Mês": 0.5,
  "Aguardando Análise INSS": 0.75,
  "Aprovada": 0.95,
};

// Ordem de exibição no funil (com emoji do display)
export const FASES_FUNIL: StatusProcesso[] = [
  "🤰 Gestantes 1 a 7 meses",
  "📥 Entradas do Mês",
  "⏳ Aguardando Análise INSS",
  "✅ Aprovada",
];

export const stripEmoji = (s: string) => {
  const parts = s.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : s;
};

export interface FaseForecast {
  fase: StatusProcesso;
  faseKey: string;
  quantidade: number;
  ticketMedio: number;
  valorBruto: number;
  valorAjustado: number;
  probabilidade: number;
  risco: "verde" | "amarelo" | "vermelho";
  metaValor: number;
  metaQuantidade: number;
  gapValor: number;
  gapQuantidade: number;
  atingimentoPct: number; // 0..1+
}

export interface PipelineForecast {
  fases: FaseForecast[];
  pipelineBruto: number;
  pipelineAjustado: number;
  curtoPrazo: number;
  risco: number;
  taxaPagamento: number;
  ticketMedioPadrao: number;
  metaTotalValor: number;
  metaTotalQuantidade: number;
  gapMetaTotal: number;
  totalMaes: number;
  loading: boolean;
}

export function usePipelineForecast(): PipelineForecast {
  const { maes, loading: loadingMaes } = useMaesData();
  const { metas, premissas, loading: loadingCfg } = useForecastMetas();

  return useMemo(() => {
    const ticketMedioPadrao = premissas?.ticket_medio_padrao ?? DEFAULT_TICKET_MEDIO;
    const taxaPagamento = premissas?.taxa_pagamento_padrao ?? DEFAULT_TAXA_PAGAMENTO;

    // Mapeia status legados/agrupados para as fases visíveis do funil (MVP 1)
    const statusToFase = (status: string): StatusProcesso | null => {
      if (!status) return null;
      const key = stripEmoji(status);
      if (key === "Gestantes 1 a 7 meses" || key === "Gestantes em Maturação") return "🤰 Gestantes 1 a 7 meses";
      if (key === "Entradas do Mês" || key === "Pendência Documental" || key === "Elegível") return "📥 Entradas do Mês";
      if (key === "Aguardando Análise INSS") return "⏳ Aguardando Análise INSS";
      if (key === "Aprovada") return "✅ Aprovada";
      return null;
    };

    const counts = new Map<StatusProcesso, number>();
    for (const m of maes) {
      const fase = statusToFase(m.status_processo);
      if (!fase) continue;
      counts.set(fase, (counts.get(fase) || 0) + 1);
    }

    const metaByFase = new Map(metas.map((m) => [m.status_processo, m]));

    const fases: FaseForecast[] = FASES_FUNIL.map((fase) => {
      const key = stripEmoji(fase);
      const quantidade = counts.get(fase) || 0;
      const probabilidade = PROBABILIDADE_FASE[key] ?? 0;

      const metaRow = metaByFase.get(key);
      const ticketMedio = metaRow?.ticket_medio ?? ticketMedioPadrao;
      const taxaFase = metaRow?.taxa_pagamento ?? taxaPagamento;
      const metaQuantidadeVal = metaRow?.meta_quantidade ?? 0;
      const metaValor = metaQuantidadeVal * ticketMedio;
      const metaQuantidade = metaQuantidadeVal;

      const valorBruto = quantidade * ticketMedio;
      const valorAjustado = valorBruto * probabilidade * taxaFase;

      let risco: "verde" | "amarelo" | "vermelho" = "verde";
      if (key === "Entradas do Mês") risco = "amarelo";

      const gapValor = metaValor - valorBruto;
      const gapQuantidade = metaQuantidade - quantidade;
      const atingimentoPct = metaValor > 0 ? valorBruto / metaValor : 0;

      return {
        fase,
        faseKey: key,
        quantidade,
        ticketMedio,
        valorBruto,
        valorAjustado,
        probabilidade,
        risco,
        metaValor,
        metaQuantidade,
        gapValor,
        gapQuantidade,
        atingimentoPct,
      };
    });

    const pipelineBruto = fases.reduce((a, f) => a + f.valorBruto, 0);
    const pipelineAjustado = fases.reduce((a, f) => a + f.valorAjustado, 0);

    const curtoPrazo = fases
      .filter((f) => f.faseKey === "Aprovada" || f.faseKey === "Aguardando Análise INSS")
      .reduce((a, f) => a + f.valorAjustado, 0);

    const risco = fases
      .filter((f) => f.faseKey === "Entradas do Mês")
      .reduce((a, f) => a + f.valorAjustado, 0);

    const metaTotalValor = fases.reduce((a, f) => a + f.metaValor, 0);
    const metaTotalQuantidade = fases.reduce((a, f) => a + f.metaQuantidade, 0);
    const gapMetaTotal = metaTotalValor - pipelineBruto;
    const totalMaes = fases.reduce((a, f) => a + f.quantidade, 0);

    return {
      fases,
      pipelineBruto,
      pipelineAjustado,
      curtoPrazo,
      risco,
      taxaPagamento,
      ticketMedioPadrao,
      metaTotalValor,
      metaTotalQuantidade,
      gapMetaTotal,
      totalMaes,
      loading: loadingMaes || loadingCfg,
    };
  }, [maes, metas, premissas, loadingMaes, loadingCfg]);
}
