import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileUp, Brain } from "lucide-react";
import { usePreAnalise } from "@/hooks/usePreAnalise";
import { PreAnaliseSimplificadaCard } from "./PreAnaliseSimplificadaCard";
import { DocumentUploadField } from "./DocumentUploadField";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  type DadosEntradaAnalise,
  type PreAnalise,
  type ResultadoAtendente,
  type ProximaAcaoAnalise,
} from "@/types/preAnalise";
import type { MaeProcesso } from "@/types/mae";

interface PreAnaliseAtendenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mae: MaeProcesso;
  onSuccess?: (analise: PreAnalise) => void;
}

// Mapear categoria do mae_processo para o enum
const mapCategoria = (cat: string): string => {
  const map: Record<string, string> = {
    "CLT": "empregada",
    "MEI": "mei",
    "Contribuinte Individual": "individual",
    "Desempregada": "desempregada",
    "Não informado": "",
  };
  return map[cat] || "";
};

const mapEvento = (evento: string): string => {
  const map: Record<string, string> = {
    "Parto": "parto",
    "Adoção": "adocao",
    "Guarda judicial": "adocao",
  };
  return map[evento] || "parto";
};

export function PreAnaliseAtendenteDialog({
  open,
  onOpenChange,
  mae,
  onSuccess,
}: PreAnaliseAtendenteDialogProps) {
  const { isLoading, executarAnalise } = usePreAnalise();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // URLs dos documentos anexados
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

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setDocumentos({
        cnis: null,
        ctps: null,
        certidao: null,
        comprov_endereco: null,
      });
      setResultado(null);
    }
  }, [open]);

  const handleGerarAnalise = async () => {
    // Validação: se não tem CNIS nem CTPS anexado, salvar reprovação no banco
    if (!hasMinDocs) {
      setIsSaving(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: "Erro",
            description: "Você precisa estar logado.",
            variant: "destructive",
          });
          return;
        }

        // Buscar próxima versão
        const { data: versionData } = await supabase
          .rpc("get_next_analise_version", { p_mae_id: mae.id });
        
        const versao = versionData || 1;
        
        // Salvar reprovação por falta de documentos
        const { error } = await supabase
          .from("pre_analise")
          .insert({
            mae_id: mae.id,
            user_id: session.user.id,
            dados_entrada: {
              cpf: mae.cpf.replace(/\D/g, ""),
              nome: mae.nome_mae,
              documentos: { 
                cnis: null, 
                ctps: null, 
                certidao: null, 
                comprov_endereco: null,
              },
            },
            status_analise: "nao_aprovavel",
            resultado_atendente: "REPROVADO",
            motivo_curto: "Documentos obrigatórios não anexados (CNIS ou CTPS)",
            proxima_acao: "SOLICITAR_DOCS",
            versao,
            motivo_reanalise: "primeiro_registro",
            processado_em: new Date().toISOString(),
          });

        if (error) {
          console.error("Erro ao salvar reprovação:", error);
          toast({
            title: "Erro",
            description: "Não foi possível salvar a análise.",
            variant: "destructive",
          });
          return;
        }

        setResultado({
          resultado_atendente: "REPROVADO",
          motivo_curto: "Documentos obrigatórios não anexados (CNIS ou CTPS)",
          proxima_acao: "SOLICITAR_DOCS",
        });

        toast({
          title: "Análise salva",
          description: "Reprovada por falta de documentos obrigatórios.",
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const dadosEntrada: DadosEntradaAnalise = {
      cpf: mae.cpf.replace(/\D/g, ""),
      nome: mae.nome_mae,
      categoria: mapCategoria(mae.categoria_previdenciaria),
      gestante: mae.is_gestante,
      evento: mapEvento(mae.tipo_evento),
      data_evento: mae.data_evento || "",
      total_contribuicoes: 0,
      teve_120_contribuicoes: false,
      recebeu_seguro_desemprego: false,
      mei_ativo: mae.categoria_previdenciaria === "MEI",
      competencias_em_atraso: false,
      documentos: {
        cnis: !!documentos.cnis,
        ctps: !!documentos.ctps,
        certidao: !!documentos.certidao,
        comprov_endereco: !!documentos.comprov_endereco,
        outros: [],
        // Salvar URLs dos documentos
        cnis_url: documentos.cnis || undefined,
        ctps_url: documentos.ctps || undefined,
        certidao_url: documentos.certidao || undefined,
        comprov_endereco_url: documentos.comprov_endereco || undefined,
      },
      observacoes_atendente: mae.observacoes || "",
    };

    const analise = await executarAnalise(mae.id, dadosEntrada);

    if (analise) {
      setResultado({
        resultado_atendente: analise.resultado_atendente || "JURIDICO",
        motivo_curto: analise.motivo_curto || "Análise necessária",
        proxima_acao: analise.proxima_acao || "ENCAMINHAR_JURIDICO",
      });
      onSuccess?.(analise);
    }
  };

  const handleProximaAcao = () => {
    onOpenChange(false);
  };

  const totalDocs = Object.values(documentos).filter(Boolean).length;
  const hasMinDocs = documentos.cnis || documentos.ctps; // CNIS ou CTPS obrigatório

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Pré-Análise
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mae.nome_mae}
          </p>
        </DialogHeader>

        {!resultado ? (
          <div className="space-y-6">
            {/* Upload de documentos */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Anexar Documentos</p>
              </div>
              
              <div className="grid gap-3">
                <DocumentUploadField
                  label="CNIS"
                  docType="cnis"
                  maeId={mae.id}
                  uploadedUrl={documentos.cnis}
                  onUpload={(url) => setDocumentos(prev => ({ ...prev, cnis: url }))}
                />

                <DocumentUploadField
                  label="CTPS"
                  docType="ctps"
                  maeId={mae.id}
                  uploadedUrl={documentos.ctps}
                  onUpload={(url) => setDocumentos(prev => ({ ...prev, ctps: url }))}
                />

                <DocumentUploadField
                  label="Certidão (Nascimento/Adoção)"
                  docType="certidao"
                  maeId={mae.id}
                  uploadedUrl={documentos.certidao}
                  onUpload={(url) => setDocumentos(prev => ({ ...prev, certidao: url }))}
                />

                <DocumentUploadField
                  label="Comprovante de Endereço"
                  docType="comprov_endereco"
                  maeId={mae.id}
                  uploadedUrl={documentos.comprov_endereco}
                  onUpload={(url) => setDocumentos(prev => ({ ...prev, comprov_endereco: url }))}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {totalDocs} documento{totalDocs !== 1 ? "s" : ""} anexado{totalDocs !== 1 ? "s" : ""}
                {!hasMinDocs && " • CNIS ou CTPS obrigatório"}
              </p>
            </div>

            <Separator />

            {/* Botão de gerar análise */}
            <Button
              size="lg"
              className="w-full h-14 text-lg gap-2"
              onClick={handleGerarAnalise}
              disabled={isLoading || isSaving}
            >
              {isLoading || isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {isSaving ? "Salvando..." : "Analisando..."}
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5" />
                  Gerar Pré-Análise
                </>
              )}
            </Button>
            
            {!hasMinDocs && (
              <p className="text-xs text-destructive text-center">
                ⚠️ Sem CNIS ou CTPS anexado, a análise será reprovada automaticamente
              </p>
            )}
          </div>
        ) : (
          /* Resultado simplificado */
          <PreAnaliseSimplificadaCard
            resultado={resultado.resultado_atendente}
            motivoCurto={resultado.motivo_curto}
            proximaAcao={resultado.proxima_acao}
            onProximaAcao={handleProximaAcao}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}