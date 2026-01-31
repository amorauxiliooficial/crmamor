import { MetaProgress } from "@/hooks/useMetas";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  FileSignature, 
  CheckCircle2, 
  Activity,
  Target,
  TrendingUp
} from "lucide-react";

interface MetaProgressCardProps {
  progress: MetaProgress;
}

const TIPO_ICONS: Record<string, typeof Users> = {
  cadastros: Users,
  contratos: FileSignature,
  aprovados: CheckCircle2,
  atividades: Activity,
  follow_ups: Activity,
};

const TIPO_COLORS: Record<string, string> = {
  cadastros: "text-primary",
  contratos: "text-emerald-500",
  aprovados: "text-chart-1",
  atividades: "text-chart-2",
  follow_ups: "text-chart-3",
};

const PERIODO_LABELS: Record<string, string> = {
  diario: "Hoje",
  semanal: "Esta semana",
  mensal: "Este mês",
};

export function MetaProgressCard({ progress }: MetaProgressCardProps) {
  const { meta, realizado, percentual } = progress;
  const Icon = TIPO_ICONS[meta.tipo_meta] || Target;
  const colorClass = TIPO_COLORS[meta.tipo_meta] || "text-primary";
  const faltam = Math.max(0, meta.valor_meta - realizado);
  const atingido = percentual >= 100;

  return (
    <Card className={`transition-all hover:shadow-md ${atingido ? "border-emerald-500/50 bg-emerald-500/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-medium text-sm">{meta.nome}</h4>
              <p className="text-[10px] text-muted-foreground uppercase">{PERIODO_LABELS[meta.periodo]}</p>
            </div>
          </div>
          {atingido && (
            <div className="flex items-center gap-1 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Meta!</span>
            </div>
          )}
        </div>

        {/* Numbers */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className={`text-2xl font-bold ${atingido ? "text-emerald-500" : ""}`}>{realizado}</span>
            <span className="text-muted-foreground text-sm">/{meta.valor_meta}</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {atingido ? "Parabéns!" : `Faltam ${faltam}`}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress 
          value={percentual} 
          className={`h-2 ${atingido ? "[&>div]:bg-emerald-500" : ""}`}
        />
        
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {percentual.toFixed(0)}%
        </p>
      </CardContent>
    </Card>
  );
}
