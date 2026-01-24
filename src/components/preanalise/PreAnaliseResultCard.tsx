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
  FileCheck,
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
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case "APROVADA":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case "APROVADA_COM_RESSALVAS":
        return <AlertTriangle className="h-5 w-5 text-chart-1" />;
      case "NAO_APROVAVEL":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case "BLOQUEIO":
        return "bg-destructive/20 text-destructive";
      case "ALERTA":
        return "bg-chart-1/20 text-chart-1";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const normalizedStatus = analise.status_analise?.toUpperCase() as keyof typeof STATUS_ANALISE_LABELS;

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
              <Badge className={STATUS_ANALISE_COLORS[normalizedStatus] || "bg-muted"}>
                {STATUS_ANALISE_LABELS[normalizedStatus] || analise.status_analise}
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
          
          {analise.carencia && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Carência</p>
              <div className="flex items-center gap-2">
                {analise.carencia.cumprida ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm">{analise.carencia.detalhe || analise.carencia.regra}</span>
              </div>
            </div>
          )}

          {analise.periodo_de_graca && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Período de Graça</p>
              <div className="flex items-center gap-2">
                {analise.periodo_de_graca.dentro ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm">
                  {analise.periodo_de_graca.detalhe || `Até ${analise.periodo_de_graca.data_limite}`}
                </span>
              </div>
            </div>
          )}

          {analise.cnis && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">CNIS</p>
              <div className="flex items-center gap-2">
                {analise.cnis.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-chart-1" />
                )}
                <span className="text-sm">
                  {analise.cnis.ok ? "OK" : `${analise.cnis.pontos_de_atencao?.length || 0} pontos de atenção`}
                </span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Riscos Identificados */}
        {analise.riscos && analise.riscos.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-chart-1" />
              Riscos Identificados ({analise.riscos.length})
            </h4>
            <div className="space-y-2">
              {analise.riscos.map((risco, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm">{risco.motivo}</p>
                    <Badge className={getNivelColor(risco.nivel)}>
                      {risco.nivel}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analise.riscos && analise.riscos.length > 0 && <Separator />}

        {/* Conclusão Detalhada */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Conclusão
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {analise.conclusao || "Sem detalhes disponíveis."}
          </p>
        </div>

        {/* Checklist de Documentos */}
        {analise.checklist_documentos && analise.checklist_documentos.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Checklist de Documentos
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {analise.checklist_documentos.map((doc, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {doc.status === "OK" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{doc.doc}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
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
