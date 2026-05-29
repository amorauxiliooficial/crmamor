import { AlertTriangle, Zap, Target, DollarSign } from "lucide-react";
import { InsightBlock } from "./InsightBlock";
import type { PipelineForecast } from "@/hooks/usePipelineForecast";

const FASE_TONE: Record<string, string> = {
  "Pendência Documental": "amarelo",
  "Renegociação": "laranja",
  "Inadimplência": "vermelho",
  "Recurso / Judicial": "vermelho",
};

interface InsightsSidebarProps {
  forecast: PipelineForecast;
  formatBRL: (n: number) => string;
  formatBRLShort: (n: number) => string;
}

export function InsightsSidebar({ forecast, formatBRL, formatBRLShort }: InsightsSidebarProps) {
  // Top Riscos: fases vermelho/laranja com valor > 0
  const topRiscos = forecast.fases
    .filter((f) => {
      const tone = FASE_TONE[f.faseKey];
      return (tone === "vermelho" || tone === "laranja") && f.valorBruto > 0;
    })
    .sort((a, b) => b.valorBruto - a.valorBruto)
    .slice(0, 3)
    .map((f) => ({
      label: f.fase.replace(/^[^\s]+\s/, ""),
      value: formatBRLShort(f.valorBruto),
      tone: (FASE_TONE[f.faseKey] === "vermelho" ? "danger" : "warning") as "danger" | "warning",
      hint: `${f.quantidade} ${f.quantidade === 1 ? "mãe" : "mães"} · ${(f.probabilidade * 100).toFixed(0)}% prob.`,
    }));

  // Próximas Conversões: Aprovada + Aguardando INSS
  const proximas = forecast.fases
    .filter((f) => (f.faseKey === "Aprovada" || f.faseKey === "Aguardando Análise INSS") && f.quantidade > 0)
    .sort((a, b) => b.valorAjustado - a.valorAjustado)
    .map((f) => ({
      label: f.fase.replace(/^[^\s]+\s/, ""),
      value: formatBRLShort(f.valorAjustado),
      tone: "success" as const,
      hint: `${f.quantidade} ${f.quantidade === 1 ? "mãe" : "mães"} · ${(f.probabilidade * 100).toFixed(0)}% prob.`,
    }));

  // Gap vs Meta por fase
  const gaps = forecast.fases
    .map((f) => {
      const meta = f.valorBruto * 0.8 * forecast.taxaPagamento;
      const gap = meta - f.valorAjustado;
      return { f, meta, gap };
    })
    .filter((x) => x.gap > 0 && x.f.quantidade > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 4)
    .map(({ f, gap }) => ({
      label: f.fase.replace(/^[^\s]+\s/, ""),
      value: `−${formatBRLShort(gap)}`,
      tone: "danger" as const,
      hint: `meta · ${formatBRLShort(f.valorBruto * 0.8 * forecast.taxaPagamento)}`,
    }));

  const kpis = [
    { label: "Pipeline Bruto", value: formatBRL(forecast.pipelineBruto), tone: "default" as const },
    { label: "Pipeline Ajustado", value: formatBRL(forecast.pipelineAjustado), tone: "info" as const },
    { label: "Curto Prazo", value: formatBRL(forecast.curtoPrazo), tone: "success" as const },
  ];

  return (
    <aside className="space-y-3">
      <InsightBlock
        title="Top Riscos"
        icon={AlertTriangle}
        iconTone="danger"
        rows={topRiscos}
        emptyText="Sem fases em risco"
      />
      <InsightBlock
        title="Próximas Conversões"
        icon={Zap}
        iconTone="success"
        rows={proximas}
        emptyText="Nenhuma conversão próxima"
      />
      <InsightBlock
        title="Gap vs Meta"
        icon={Target}
        iconTone="warning"
        rows={gaps}
        emptyText="Todas as fases na meta"
      />
      <InsightBlock title="Resumo Financeiro" icon={DollarSign} iconTone="primary" rows={kpis} />
    </aside>
  );
}
