import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileUp, Brain, CheckCircle2, XCircle, Scale, RotateCcw } from "lucide-react";
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
  
  // Documentos anexados (usando um ID temporário como identificador)
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

  const hasMinDocs = documentos.cnis || documentos.ctps;
  const totalDocs = Object.values(documentos).filter(Boolean).length;

  const handleGerarAnalise = async () => {
    if (!hasMinDocs) {
      setResultado({
        resultado_atendente: "REPROVADO",
        motivo_curto: "Documentos obrigatórios não anexados (CNIS ou CTPS)",
        proxima_acao: "SOLICITAR_DOCS",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Chamar edge function para análise
      const { data, error } = await supabase.functions.invoke("pre-analise-elegibilidade", {
        body: {
          mae_id: null, // Análise avulsa, sem mãe cadastrada
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
        description: "Não foi possível processar a análise. Tente novamente.",
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

  const getResultadoIcon = (resultado: ResultadoAtendente) => {
    switch (resultado) {
      case "APROVADO":
        return <CheckCircle2 className="h-12 w-12 text-primary" />;
      case "REPROVADO":
        return <XCircle className="h-12 w-12 text-destructive" />;
      case "JURIDICO":
        return <Scale className="h-12 w-12 text-chart-1" />;
      default:
        return <Brain className="h-12 w-12 text-muted-foreground" />;
    }
  };

  const getResultadoColor = (resultado: ResultadoAtendente) => {
    switch (resultado) {
      case "APROVADO":
        return "bg-primary/10 border-primary/30";
      case "REPROVADO":
        return "bg-destructive/10 border-destructive/30";
      case "JURIDICO":
        return "bg-chart-1/10 border-chart-1/30";
      default:
        return "bg-muted";
    }
  };

  const getResultadoLabel = (resultado: ResultadoAtendente) => {
    switch (resultado) {
      case "APROVADO":
        return "Elegível";
      case "REPROVADO":
        return "Não Elegível";
      case "JURIDICO":
        return "Avaliação Jurídica";
      default:
        return "Indefinido";
    }
  };

  // ========== RESULTADO ==========
  if (resultado) {
    return (
      <Card className={`border-2 ${getResultadoColor(resultado.resultado_atendente)}`}>
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {getResultadoIcon(resultado.resultado_atendente)}
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">
                {getResultadoLabel(resultado.resultado_atendente)}
              </h2>
              <p className="text-muted-foreground max-w-md">
                {resultado.motivo_curto}
              </p>
            </div>

            <Separator className="my-4" />

            <div className="bg-muted/50 rounded-lg p-4 w-full max-w-md">
              <p className="text-sm font-medium mb-1">Próximo passo:</p>
              <p className="text-sm text-muted-foreground">
                {PROXIMA_ACAO_LABELS[resultado.proxima_acao] || resultado.proxima_acao}
              </p>
            </div>

            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2 mt-4"
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-5 w-5 text-primary" />
          Anexar Documentos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Envie os documentos para verificar a elegibilidade ao salário-maternidade
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload de documentos */}
        <div className="grid gap-3">
          <DocumentUploadField
            label="CNIS"
            docType="cnis"
            maeId={sessionId}
            uploadedUrl={documentos.cnis}
            onUpload={(url) => setDocumentos(prev => ({ ...prev, cnis: url }))}
          />

          <DocumentUploadField
            label="CTPS"
            docType="ctps"
            maeId={sessionId}
            uploadedUrl={documentos.ctps}
            onUpload={(url) => setDocumentos(prev => ({ ...prev, ctps: url }))}
          />

          <DocumentUploadField
            label="Certidão (Nascimento/Adoção)"
            docType="certidao"
            maeId={sessionId}
            uploadedUrl={documentos.certidao}
            onUpload={(url) => setDocumentos(prev => ({ ...prev, certidao: url }))}
          />

          <DocumentUploadField
            label="Comprovante de Endereço"
            docType="comprov_endereco"
            maeId={sessionId}
            uploadedUrl={documentos.comprov_endereco}
            onUpload={(url) => setDocumentos(prev => ({ ...prev, comprov_endereco: url }))}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {totalDocs} documento{totalDocs !== 1 ? "s" : ""} anexado{totalDocs !== 1 ? "s" : ""}
          {!hasMinDocs && " • CNIS ou CTPS obrigatório"}
        </p>

        <Separator />

        {/* Botão de gerar análise */}
        <Button
          size="lg"
          className="w-full h-14 text-lg gap-2"
          onClick={handleGerarAnalise}
          disabled={isLoading}
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
        
        {!hasMinDocs && (
          <p className="text-xs text-destructive text-center">
            ⚠️ Sem CNIS ou CTPS anexado, a análise será reprovada automaticamente
          </p>
        )}
      </CardContent>
    </Card>
  );
}
