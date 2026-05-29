import { useMemo } from "react";
import { useMaesData } from "@/hooks/useMaesData";
import { StatusProcesso } from "@/types/mae";

export const DEFAULT_TICKET_MEDIO = 1800;
export const DEFAULT_TAXA_PAGAMENTO = 0.75;

// Probabilidades por fase (sem emoji)
export const PROBABILIDADE_FASE: Record<string, number> = {
  "Pendência Documental": 0.35,
  "Elegível (Análise Positiva)": 0.6,
  "Aguardando Análise INSS": 0.75,
  "Aprovada": 0.95,
  "Renegociação": 0.5,
  "Recurso / Judicial": 0.4,
  "Inadimplência": 0.25,
  "Rescisão de Contrato": 0.1,
  "Processo Encerrado": 0,
  "Indeferida": 0,
};

// Ordem de exibição no funil
export const FASES_FUNIL: StatusProcesso[] = [
  "⚠️ Pendência Documental",
  "🟡 Elegível (Análise Positiva)",
  "⏳ Aguardando Análise INSS",
  "✅ Aprovada",
  "🤝 Renegociação",
  "⚖️ Recurso / Judicial",
  "💳 Inadimplência",
];


const stripEmoji = (s: string) => {
  const parts = s.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : s;
};

export interface FaseForecast {
  fase: StatusProcesso;
  faseKey: string;
  quantidade: number;
  valorBruto: number;
  valorAjustado: number;
  probabilidade: number;
  risco: "verde" | "amarelo" | "vermelho";
}

export interface PipelineForecast {
  fases: FaseForecast[];
  pipelineBruto: number;
  pipelineAjustado: number;
  curtoPrazo: number;
  risco: number;
  taxaPagamento: number;
  metaSaudavel: number;
  gapMeta: number;
  totalMaes: number;
  loading: boolean;
}

interface Options {
  ticketMedio?: number;
  taxaPagamento?: number;
}

export function usePipelineForecast(opts: Options = {}): PipelineForecast {
  const ticketMedio = opts.ticketMedio ?? DEFAULT_TICKET_MEDIO;
  const taxaPagamento = opts.taxaPagamento ?? DEFAULT_TAXA_PAGAMENTO;
  const { maes, loading } = useMaesData();

  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of maes) {
      counts.set(m.status_processo, (counts.get(m.status_processo) || 0) + 1);
    }

    const fases: FaseForecast[] = FASES_FUNIL.map((fase) => {
      const key = stripEmoji(fase);
      const quantidade = counts.get(fase) || 0;
      const probabilidade = PROBABILIDADE_FASE[key] ?? 0;
      const valorBruto = quantidade * ticketMedio;
      const valorAjustado = valorBruto * probabilidade * taxaPagamento;

      let risco: "verde" | "amarelo" | "vermelho" = "verde";
      if (key === "Inadimplência" || key === "Recurso / Judicial") risco = "vermelho";
      else if (key === "Renegociação" || key === "Pendência Documental") risco = "amarelo";
      else if (key === "Processo Encerrado") risco = "vermelho";

      return { fase, faseKey: key, quantidade, valorBruto, valorAjustado, probabilidade, risco };
    });

    const pipelineBruto = fases.reduce((a, f) => a + f.valorBruto, 0);
    const pipelineAjustado = fases.reduce((a, f) => a + f.valorAjustado, 0);

    const curtoPrazo = fases
      .filter((f) => f.faseKey === "Aprovada" || f.faseKey === "Aguardando Análise INSS")
      .reduce((a, f) => a + f.valorAjustado, 0);

    const risco = fases
      .filter((f) => f.faseKey === "Inadimplência" || f.faseKey === "Renegociação")
      .reduce((a, f) => a + f.valorAjustado, 0);

    // Meta saudável = 80% do pipeline bruto convertido
    const metaSaudavel = pipelineBruto * 0.8 * taxaPagamento;
    const gapMeta = metaSaudavel - pipelineAjustado;

    return {
      fases,
      pipelineBruto,
      pipelineAjustado,
      curtoPrazo,
      risco,
      taxaPagamento,
      metaSaudavel,
      gapMeta,
      totalMaes: maes.length,
      loading,
    };
  }, [maes, ticketMedio, taxaPagamento, loading]);
}
