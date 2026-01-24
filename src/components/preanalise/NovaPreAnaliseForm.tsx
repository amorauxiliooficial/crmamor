import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Brain, 
  CheckCircle2, 
  XCircle, 
  Scale, 
  RotateCcw,
  Upload,
  FileCheck,
  ArrowRight,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DocumentUploadField } from "./DocumentUploadField";
import { MaeFormDialog } from "@/components/mae/MaeFormDialog";
import type { ResultadoAtendente, ProximaAcaoAnalise } from "@/types/preAnalise";
import { cn } from "@/lib/utils";

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
  const [showMaeDialog, setShowMaeDialog] = useState(false);
  
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

  const canRegisterMae = resultado && 
    (resultado.resultado_atendente === "APROVADO" || resultado.resultado_atendente === "JURIDICO");

  const handleMaeSuccess = () => {
    toast({
      title: "Mãe cadastrada!",
      description: "O cadastro foi criado com sucesso no sistema.",
    });
    handleNovaAnalise();
  };

  const hasContribuicaoDoc = documentos.cnis || documentos.ctps;
  const hasCertidao = !!documentos.certidao;
  const isReadyToAnalyze = hasContribuicaoDoc && hasCertidao;
  const docsCount = [documentos.cnis, documentos.ctps, documentos.certidao, documentos.comprov_endereco].filter(Boolean).length;

  const handleGerarAnalise = async () => {
    if (!isReadyToAnalyze) {
      const missing: string[] = [];
      if (!hasContribuicaoDoc) missing.push("CNIS ou CTPS");
      if (!hasCertidao) missing.push("Certidão");
      
      setResultado({
        resultado_atendente: "REPROVADO",
        motivo_curto: `Documentos faltando: ${missing.join(" e ")}`,
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
        icon: CheckCircle2,
        title: "Elegível",
        subtitle: "A cliente tem direito ao salário-maternidade",
        gradient: "from-emerald-500 to-teal-600",
        bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
        iconBg: "bg-emerald-500",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
      },
      REPROVADO: {
        icon: XCircle,
        title: "Não Elegível",
        subtitle: "Não atende aos requisitos necessários",
        gradient: "from-rose-500 to-red-600",
        bgGradient: "from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30",
        iconBg: "bg-rose-500",
        badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
      },
      JURIDICO: {
        icon: Scale,
        title: "Análise Jurídica",
        subtitle: "Requer avaliação especializada",
        gradient: "from-amber-500 to-orange-600",
        bgGradient: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
        iconBg: "bg-amber-500",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      },
    }[resultado.resultado_atendente] || {
      icon: Brain,
      title: "Indefinido",
      subtitle: "Resultado não determinado",
      gradient: "from-gray-400 to-gray-500",
      bgGradient: "from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/30",
      iconBg: "bg-gray-500",
      badge: "bg-gray-100 text-gray-700",
    };

    const IconComponent = resultConfig.icon;

    return (
      <>
        <div className={cn(
          "rounded-3xl overflow-hidden",
          "bg-gradient-to-br",
          resultConfig.bgGradient
        )}>
          {/* Header com gradiente */}
          <div className={cn(
            "bg-gradient-to-r p-8 text-white text-center",
            resultConfig.gradient
          )}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4">
              <IconComponent className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-bold mb-1">{resultConfig.title}</h2>
            <p className="text-white/80">{resultConfig.subtitle}</p>
          </div>

          {/* Conteúdo */}
          <div className="p-6 space-y-6">
            {/* Motivo */}
            {resultado.motivo_curto && (
              <div className="bg-background/80 backdrop-blur rounded-2xl p-4 border">
                <p className="text-sm text-muted-foreground mb-1">Observação</p>
                <p className="font-medium">{resultado.motivo_curto}</p>
              </div>
            )}

            {/* Próxima Ação */}
            <div className="bg-background/80 backdrop-blur rounded-2xl p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Próximo Passo</span>
              </div>
              <p className="text-muted-foreground">
                {PROXIMA_ACAO_LABELS[resultado.proxima_acao] || resultado.proxima_acao}
              </p>
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-3 pt-2">
              {canRegisterMae && (
                <Button 
                  size="lg" 
                  className="w-full h-14 text-base gap-2 rounded-xl shadow-lg"
                  onClick={() => setShowMaeDialog(true)}
                >
                  <UserPlus className="h-5 w-5" />
                  Cadastrar no Sistema
                </Button>
              )}
              
              <Button 
                size="lg" 
                variant="outline"
                className="w-full h-12 gap-2 rounded-xl"
                onClick={handleNovaAnalise}
              >
                <RotateCcw className="h-4 w-4" />
                Nova Análise
              </Button>
            </div>
          </div>
        </div>

        <MaeFormDialog
          open={showMaeDialog}
          onOpenChange={setShowMaeDialog}
          onSuccess={handleMaeSuccess}
        />
      </>
    );
  }

  // ========== FORMULÁRIO ==========
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground mb-4 shadow-lg">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Verificar Elegibilidade</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Anexe os documentos necessários para analisar o direito ao salário-maternidade
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        <Badge 
          variant={isReadyToAnalyze ? "default" : "secondary"}
          className="gap-1.5 px-3 py-1.5"
        >
          <FileCheck className="h-3.5 w-3.5" />
          {docsCount} documento{docsCount !== 1 ? "s" : ""} anexado{docsCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Documentos Obrigatórios */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-sm font-medium">Documentos Obrigatórios</span>
        </div>

        {/* CNIS/CTPS */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Histórico de Contribuições</span>
              {hasContribuicaoDoc && (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">CNIS ou CTPS</p>
          </div>
          <div className="p-3 space-y-2">
            <DocumentUploadField
              label="CNIS"
              docType="cnis"
              maeId={sessionId}
              uploadedUrl={documentos.cnis}
              onUpload={(url) => setDocumentos(prev => ({ ...prev, cnis: url }))}
            />
            
            <div className="flex items-center gap-3 px-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <DocumentUploadField
              label="CTPS"
              docType="ctps"
              maeId={sessionId}
              uploadedUrl={documentos.ctps}
              onUpload={(url) => setDocumentos(prev => ({ ...prev, ctps: url }))}
            />
          </div>
        </div>

        {/* Certidão */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Comprovação do Evento</span>
              {hasCertidao && (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Certidão de Nascimento ou Termo de Adoção</p>
          </div>
          <div className="p-3">
            <DocumentUploadField
              label="Certidão de Nascimento / Adoção"
              docType="certidao"
              maeId={sessionId}
              uploadedUrl={documentos.certidao}
              onUpload={(url) => setDocumentos(prev => ({ ...prev, certidao: url }))}
            />
          </div>
        </div>
      </div>

      {/* Documentos Opcionais */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
          <span className="text-sm text-muted-foreground">Opcional</span>
        </div>

        <div className="rounded-2xl border border-dashed bg-card/50 p-3">
          <DocumentUploadField
            label="Comprovante de Endereço"
            docType="comprov_endereco"
            maeId={sessionId}
            uploadedUrl={documentos.comprov_endereco}
            onUpload={(url) => setDocumentos(prev => ({ ...prev, comprov_endereco: url }))}
          />
        </div>
      </div>

      {/* Botão de Análise */}
      <div className="pt-4">
        <Button
          size="lg"
          className={cn(
            "w-full h-14 text-base gap-2 rounded-xl shadow-lg transition-all",
            isReadyToAnalyze && "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          )}
          onClick={handleGerarAnalise}
          disabled={isLoading || !isReadyToAnalyze}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analisando documentos...
            </>
          ) : (
            <>
              <Brain className="h-5 w-5" />
              Verificar Elegibilidade
            </>
          )}
        </Button>
        
        {!isReadyToAnalyze && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            {!hasContribuicaoDoc && !hasCertidao 
              ? "Anexe os documentos obrigatórios para continuar"
              : !hasContribuicaoDoc 
                ? "Anexe o CNIS ou CTPS para continuar"
                : "Anexe a Certidão para continuar"
            }
          </p>
        )}
      </div>
    </div>
  );
}
