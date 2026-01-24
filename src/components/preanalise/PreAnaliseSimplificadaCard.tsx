import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Scale,
  ArrowRight,
  FileText,
  Send,
  AlertTriangle,
} from "lucide-react";
import {
  type ResultadoAtendente,
  type ProximaAcaoAnalise,
  RESULTADO_ATENDENTE_LABELS,
  PROXIMA_ACAO_LABELS,
} from "@/types/preAnalise";

interface PreAnaliseSimplificadaCardProps {
  resultado: ResultadoAtendente;
  motivoCurto: string;
  proximaAcao: ProximaAcaoAnalise;
  onProximaAcao?: () => void;
}

export function PreAnaliseSimplificadaCard({
  resultado,
  motivoCurto,
  proximaAcao,
  onProximaAcao,
}: PreAnaliseSimplificadaCardProps) {
  const getResultadoConfig = () => {
    switch (resultado) {
      case "APROVADO":
        return {
          icon: CheckCircle2,
          bgColor: "bg-emerald-500",
          textColor: "text-white",
          borderColor: "border-emerald-600",
          lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
        };
      case "REPROVADO":
        return {
          icon: XCircle,
          bgColor: "bg-destructive",
          textColor: "text-destructive-foreground",
          borderColor: "border-destructive",
          lightBg: "bg-destructive/10",
        };
      case "JURIDICO":
        return {
          icon: Scale,
          bgColor: "bg-chart-1",
          textColor: "text-white",
          borderColor: "border-chart-1",
          lightBg: "bg-chart-1/10",
        };
    }
  };

  const getProximaAcaoIcon = () => {
    switch (proximaAcao) {
      case "PROTOCOLO_INSS":
        return Send;
      case "ENCAMINHAR_JURIDICO":
        return Scale;
      case "SOLICITAR_DOCS":
        return FileText;
    }
  };

  const config = getResultadoConfig();
  const Icon = config.icon;
  const AcaoIcon = getProximaAcaoIcon();

  return (
    <Card className={`overflow-hidden border-2 ${config.borderColor}`}>
      {/* Header grande com resultado */}
      <div className={`${config.bgColor} ${config.textColor} p-8 text-center`}>
        <Icon className="h-16 w-16 mx-auto mb-4" />
        <h2 className="text-3xl font-bold uppercase tracking-wide">
          {resultado === "JURIDICO" ? "⚖️ JURÍDICO" : resultado === "APROVADO" ? "✅ APROVADO" : "❌ REPROVADO"}
        </h2>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Motivo curto - apenas se não for aprovado */}
        {resultado !== "APROVADO" && (
          <div className={`${config.lightBg} rounded-lg p-4 border ${config.borderColor}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-chart-1 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-muted-foreground uppercase mb-1">
                  Motivo
                </p>
                <p className="text-foreground font-medium">
                  {motivoCurto}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Próxima ação */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase">
            Próxima Ação
          </p>
          <Button
            size="lg"
            className="w-full gap-3 h-14 text-lg"
            variant={resultado === "APROVADO" ? "default" : "outline"}
            onClick={onProximaAcao}
          >
            <AcaoIcon className="h-5 w-5" />
            {PROXIMA_ACAO_LABELS[proximaAcao]}
            <ArrowRight className="h-5 w-5 ml-auto" />
          </Button>
        </div>

        {/* Badge de resultado discreto */}
        <div className="flex justify-center pt-2">
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {RESULTADO_ATENDENTE_LABELS[resultado]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}