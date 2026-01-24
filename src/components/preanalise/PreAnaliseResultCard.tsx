import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Shield,
  History,
} from "lucide-react";
import {
  type PreAnalise,
  STATUS_ANALISE_LABELS,
  STATUS_ANALISE_COLORS,
  MOTIVO_REANALISE_LABELS,
} from "@/types/preAnalise";

interface PreAnaliseResultCardProps {
  analise: PreAnalise;
  showHeader?: boolean;
}

export function PreAnaliseResultCard({ analise, showHeader = true }: PreAnaliseResultCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "aprovada":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case "aprovada_com_ressalvas":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case "nao_aprovavel":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getGravidadeColor = (gravidade: string) => {
    switch (gravidade) {
      case "alta":
        return "bg-destructive/20 text-destructive";
      case "media":
        return "bg-chart-1/20 text-chart-1";
      case "baixa":
        return "bg-primary/20 text-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {getStatusIcon(analise.status_analise)}
              Resultado da Análise
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <History className="h-3 w-3" />
                v{analise.versao}
              </Badge>
              <Badge className={STATUS_ANALISE_COLORS[analise.status_analise]}>
                {STATUS_ANALISE_LABELS[analise.status_analise]}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Analisado em {format(new Date(analise.processado_em || analise.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            {analise.motivo_reanalise !== "primeiro_registro" && (
              <span className="ml-2 text-xs">
                ({MOTIVO_REANALISE_LABELS[analise.motivo_reanalise]})
              </span>
            )}
          </p>
        </CardHeader>
      )}

      <CardContent className="space-y-6">
        {/* Grid de informações principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">Categoria</p>
            <p className="text-sm">{analise.categoria_identificada || "Não identificada"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">Carência</p>
            <p className="text-sm">{analise.carencia_status || "Não avaliada"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">Período de Graça</p>
            <p className="text-sm">{analise.periodo_graca_status || "Não aplicável"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">Situação CNIS</p>
            <p className="text-sm">{analise.situacao_cnis || "Não analisado"}</p>
          </div>
        </div>

        <Separator />

        {/* Riscos Identificados */}
        {analise.riscos_identificados && analise.riscos_identificados.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              Riscos Identificados ({analise.riscos_identificados.length})
            </h4>
            <div className="space-y-2">
              {analise.riscos_identificados.map((risco, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{risco.tipo}</p>
                      <p className="text-sm text-muted-foreground mt-1">{risco.descricao}</p>
                    </div>
                    <Badge className={getGravidadeColor(risco.gravidade)}>
                      {risco.gravidade.charAt(0).toUpperCase() + risco.gravidade.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Conclusão Detalhada */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Conclusão Detalhada
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {analise.conclusao_detalhada || "Sem detalhes disponíveis."}
          </p>
        </div>

        {/* Recomendações */}
        {analise.recomendacoes && analise.recomendacoes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Recomendações
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {analise.recomendacoes.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadados */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Modelo: {analise.modelo_ia_utilizado || "N/A"}
            </span>
            {analise.tokens_utilizados && (
              <span>Tokens: {analise.tokens_utilizados.toLocaleString()}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
