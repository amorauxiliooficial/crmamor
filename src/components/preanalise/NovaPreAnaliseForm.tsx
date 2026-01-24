import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Brain, 
  CheckCircle2, 
  XCircle, 
  Scale, 
  RotateCcw,
  FileText,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DocumentUploadField } from "./DocumentUploadField";
import type { ResultadoAtendente, ProximaAcaoAnalise } from "@/types/preAnalise";

interface NovaPreAnaliseFormProps {
  onSuccess?: () => void;
}

const PROXIMA_ACAO_LABELS: Record<string, string> = {
  PROTOCOLO_INSS: "Seguir para protocolo INSS",
  ENCAMINHAR_JURIDICO: "Encaminhar para avaliação jurídica",
  SOLICITAR_DOCS: "Solicitar documentos faltantes",
};

export function NovaPreAnaliseForm({ onSuccess }: NovaPreAnaliseFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [sessionId] = useState(() => crypto.randomUUID());
  const [documentos, setDocumentos] = useState<{
    cnis: string | null;
    ctps: string | null;
    certidao: string | null;
    comprov_endereco: string | null;
  }>({
    cnis: null,
    ctps: null,
    certidao: null,
    comprov_endereco: null,
  });
  
  const [resultado, setResultado] = useState<{
    resultado_atendente: ResultadoAtendente;
    motivo_curto: string;
    proxima_acao: ProximaAcaoAnalise;
  } | null>(null);

  // Validações: CNIS ou CTPS + Certidão obrigatórios
  const hasContribuicaoDoc = documentos.cnis || documentos.ctps;
  const hasCertidao = !!documentos.certidao;
  const isReadyToAnalyze = hasContribuicaoDoc && hasCertidao;
  
  const docsObrigatoriosCount = [hasContribuicaoDoc, hasCertidao].filter(Boolean).length;
  const docsOpcionaisCount = documentos.comprov_endereco ? 1 : 0;

  const handleGerarAnalise = async () => {
    if (!isReadyToAnalyze) {
      const missing: string[] = [];
      if (!hasContribuicaoDoc) missing.push("CNIS ou CTPS");
      if (!hasCertidao) missing.push("Certidão");
      
      setResultado({
        resultado_atendente: "REPROVADO",
        motivo_curto: `Falta: ${missing.join(" e ")}`,
        proxima_acao: "SOLICITAR_DOCS",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pre-analise-elegibilidade", {
        body: {
          mae_id: null,
          dados_entrada: {
            cpf: "",
            nome: "Análise Avulsa",
            categoria: "",
            gestante: false,
            evento: "parto",
            data_evento: "",
            total_contribuicoes: 0,
            teve_120_contribuicoes: false,
            recebeu_seguro_desemprego: false,
            mei_ativo: false,
            competencias_em_atraso: false,
            documentos: {
              cnis: !!documentos.cnis,
              ctps: !!documentos.ctps,
              certidao: !!documentos.certidao,
              comprov_endereco: !!documentos.comprov_endereco,
              outros: [],
              cnis_url: documentos.cnis || undefined,
              ctps_url: documentos.ctps || undefined,
              certidao_url: documentos.certidao || undefined,
              comprov_endereco_url: documentos.comprov_endereco || undefined,
            },
            observacoes_atendente: "",
          },
          motivo_reanalise: "primeiro_registro",
          session_id: sessionId,
        },
      });

      if (error) throw error;

      if (data?.analise) {
        setResultado({
          resultado_atendente: data.analise.resultado_atendente || "JURIDICO",
          motivo_curto: data.analise.motivo_curto || "Análise realizada",
          proxima_acao: data.analise.proxima_acao || "ENCAMINHAR_JURIDICO",
        });
        onSuccess?.();
      }
    } catch (error) {
      console.error("Erro na análise:", error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível processar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNovaAnalise = () => {
    setDocumentos({
      cnis: null,
      ctps: null,
      certidao: null,
      comprov_endereco: null,
    });
    setResultado(null);
  };

  // ========== RESULTADO ==========
  if (resultado) {
    const resultConfig = {
      APROVADO: {
        icon: <CheckCircle2 className="h-16 w-16" />,
        label: "Elegível",
        bgClass: "bg-gradient-to-br from-primary/20 to-primary/5",
        borderClass: "border-primary/30",
        iconClass: "text-primary",
      },
      REPROVADO: {
        icon: <XCircle className="h-16 w-16" />,
        label: "Não Elegível",
        bgClass: "bg-gradient-to-br from-destructive/20 to-destructive/5",
        borderClass: "border-destructive/30",
        iconClass: "text-destructive",
      },
      JURIDICO: {
        icon: <Scale className="h-16 w-16" />,
        label: "Avaliação Jurídica",
        bgClass: "bg-gradient-to-br from-chart-1/20 to-chart-1/5",
        borderClass: "border-chart-1/30",
        iconClass: "text-chart-1",
      },
    }[resultado.resultado_atendente] || {
      icon: <Brain className="h-16 w-16" />,
      label: "Indefinido",
      bgClass: "bg-muted",
      borderClass: "border-muted",
      iconClass: "text-muted-foreground",
    };

    return (
      <Card className={`border-2 ${resultConfig.borderClass} ${resultConfig.bgClass} overflow-hidden`}>
        <CardContent className="pt-10 pb-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className={`${resultConfig.iconClass} animate-in zoom-in-50 duration-300`}>
              {resultConfig.icon}
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                {resultConfig.label}
              </h2>
              <p className="text-muted-foreground text-lg max-w-sm">
                {resultado.motivo_curto}
              </p>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <Separator />
              
              <div className="bg-background/80 backdrop-blur rounded-xl p-5 border">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Próximo passo
                </div>
                <p className="text-muted-foreground">
                  {PROXIMA_ACAO_LABELS[resultado.proxima_acao] || resultado.proxima_acao}
                </p>
              </div>
            </div>

            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2 mt-2"
              onClick={handleNovaAnalise}
            >
              <RotateCcw className="h-4 w-4" />
              Nova Análise
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ========== FORMULÁRIO ==========
  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="pt-8 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Análise de Elegibilidade</h2>
              <p className="text-muted-foreground text-sm">
                Anexe os documentos para verificar o direito ao salário-maternidade
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentos Obrigatórios */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium">Documentos Obrigatórios</span>
            </div>
            <Badge 
              variant={docsObrigatoriosCount === 2 ? "default" : "secondary"}
              className="gap-1"
            >
              {docsObrigatoriosCount}/2
            </Badge>
          </div>

          <div className="space-y-3">
            {/* Grupo: Histórico de Contribuições */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Histórico de Contribuições
                </span>
                <Badge variant="outline" className="text-xs">
                  CNIS ou CTPS
                </Badge>
                {hasContribuicaoDoc && (
                  <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                )}
              </div>
              
              <div className="grid gap-2">
                <DocumentUploadField
                  label="CNIS - Cadastro Nacional de Informações Sociais"
                  docType="cnis"
                  maeId={sessionId}
                  uploadedUrl={documentos.cnis}
                  onUpload={(url) => setDocumentos(prev => ({ ...prev, cnis: url }))}
                />
                
                <div className="flex items-center gap-2 py-1">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground px-2">ou</span>
                  <Separator className="flex-1" />
                </div>

                <DocumentUploadField
                  label="CTPS - Carteira de Trabalho"
                  docType="ctps"
                  maeId={sessionId}
                  uploadedUrl={documentos.ctps}
                  onUpload={(url) => setDocumentos(prev => ({ ...prev, ctps: url }))}
                />
              </div>
            </div>

            {/* Certidão */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Comprovação do Evento
                </span>
                <Badge variant="outline" className="text-xs">
                  Obrigatório
                </Badge>
                {hasCertidao && (
                  <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                )}
              </div>

              <DocumentUploadField
                label="Certidão de Nascimento ou Termo de Adoção/Guarda"
                docType="certidao"
                maeId={sessionId}
                uploadedUrl={documentos.certidao}
                onUpload={(url) => setDocumentos(prev => ({ ...prev, certidao: url }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentos Opcionais */}
      <Card className="border-dashed">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Opcional</span>
            {docsOpcionaisCount > 0 && (
              <Badge variant="secondary" className="gap-1 ml-auto">
                {docsOpcionaisCount} anexado
              </Badge>
            )}
          </div>

          <DocumentUploadField
            label="Comprovante de Endereço (apenas cadastral)"
            docType="comprov_endereco"
            maeId={sessionId}
            uploadedUrl={documentos.comprov_endereco}
            onUpload={(url) => setDocumentos(prev => ({ ...prev, comprov_endereco: url }))}
          />
          
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3" />
            Não influencia na análise de elegibilidade
          </p>
        </CardContent>
      </Card>

      {/* Botão de Análise */}
      <div className="space-y-3">
        {!isReadyToAnalyze && (
          <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              {!hasContribuicaoDoc && !hasCertidao 
                ? "Anexe CNIS ou CTPS e a Certidão para continuar"
                : !hasContribuicaoDoc 
                  ? "Anexe o CNIS ou CTPS para continuar"
                  : "Anexe a Certidão de Nascimento/Adoção para continuar"
              }
            </p>
          </div>
        )}

        <Button
          size="lg"
          className="w-full h-14 text-lg gap-2 shadow-lg"
          onClick={handleGerarAnalise}
          disabled={isLoading || !isReadyToAnalyze}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Brain className="h-5 w-5" />
              Verificar Elegibilidade
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
