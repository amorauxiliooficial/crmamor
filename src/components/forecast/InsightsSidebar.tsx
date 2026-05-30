import { AlertTriangle, Zap, Target, DollarSign } from "lucide-react";
import { InsightBlock } from "./InsightBlock";
import type { PipelineForecast, FaseForecast } from "@/hooks/usePipelineForecast";

const FASE_TONE: Record<string, string> = {
  "Pendência Documental": "amarelo",
};

interface InsightsSidebarProps {
  forecast: PipelineForecast;
  formatBRL: (n: number) => string;
  formatBRLShort: (n: number) => string;
  onFaseClick?: (fase: FaseForecast) => void;
}

export function InsightsSidebar({ forecast, formatBRL, formatBRLShort, onFaseClick }: InsightsSidebarProps) {
  // Top Riscos
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
      hint: `${f.quantidade} ${f.quantidade === 1 ? "mãe" : "mães"}`,
      onClick: () => onFaseClick?.(f),
    }));

  // Próximas Conversões
  const proximas = forecast.fases
    .filter((f) => (f.faseKey === "Aprovada" || f.faseKey === "Aguardando Análise INSS") && f.quantidade > 0)
    .sort((a, b) => b.valorAjustado - a.valorAjustado)
    .map((f) => ({
      label: f.fase.replace(/^[^\s]+\s/, ""),
      value: formatBRLShort(f.valorAjustado),
      tone: "success" as const,
      hint: `${f.quantidade} ${f.quantidade === 1 ? "mãe" : "mães"}`,
      onClick: () => onFaseClick?.(f),
    }));

  // Fases abaixo da meta
  const abaixoMeta = forecast.fases
    .filter((f) => f.metaValor > 0 && f.atingimentoPct < 1)
    .sort((a, b) => a.atingimentoPct - b.atingimentoPct)
    .slice(0, 4)
    .map((f) => ({
      label: f.fase.replace(/^[^\s]+\s/, ""),
      value: `${(f.atingimentoPct * 100).toFixed(0)}%`,
      tone: (f.atingimentoPct < 0.6 ? "danger" : "warning") as "danger" | "warning",
      hint: `gap ${formatBRLShort(f.gapValor)}`,
      onClick: () => onFaseClick?.(f),
    }));

  const kpis = [
    { label: "Pipeline Bruto", value: formatBRL(forecast.pipelineBruto), tone: "default" as const },
    { label: "Pipeline Ajustado", value: formatBRL(forecast.pipelineAjustado), tone: "info" as const },
    { label: "Curto Prazo", value: formatBRL(forecast.curtoPrazo), tone: "success" as const },
    { label: "Meta total", value: formatBRL(forecast.metaTotalValor), tone: "default" as const },
  ];

  return (
    <aside className="space-y-3">
      <InsightBlock title="Top Riscos" icon={AlertTriangle} iconTone="danger" rows={topRiscos} emptyText="Sem fases em risco" />
      <InsightBlock title="Próximas Conversões" icon={Zap} iconTone="success" rows={proximas} emptyText="Nenhuma conversão próxima" />
      <InsightBlock title="Fases abaixo da meta" icon={Target} iconTone="warning" rows={abaixoMeta} emptyText="Todas as fases atingiram a meta" />
      <InsightBlock title="Resumo Financeiro" icon={DollarSign} iconTone="primary" rows={kpis} />
    </aside>
  );
}
