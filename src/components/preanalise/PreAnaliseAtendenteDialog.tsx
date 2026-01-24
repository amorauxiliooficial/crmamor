import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileUp, Brain, CheckCircle2 } from "lucide-react";
import { usePreAnalise } from "@/hooks/usePreAnalise";
import { PreAnaliseSimplificadaCard } from "./PreAnaliseSimplificadaCard";
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
  
  const [documentos, setDocumentos] = useState({
    cnis: false,
    ctps: false,
    certidao: false,
    comprov_endereco: false,
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
        cnis: false,
        ctps: false,
        certidao: false,
        comprov_endereco: false,
      });
      setResultado(null);
    }
  }, [open]);

  const handleGerarAnalise = async () => {
    // Validação: se não tem CNIS nem CTPS, retornar reprovado imediatamente
    if (!hasMinDocs) {
      setResultado({
        resultado_atendente: "REPROVADO",
        motivo_curto: "Documentos obrigatórios não anexados (CNIS ou CTPS)",
        proxima_acao: "SOLICITAR_DOCS",
      });
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
        ...documentos,
        outros: [],
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
    // Aqui você pode implementar a ação específica
    // Por agora apenas fecha o dialog
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
            {/* Checklist de documentos - simples */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Documentos Anexados</p>
              </div>
              
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="doc_cnis"
                    checked={documentos.cnis}
                    onCheckedChange={(checked) => 
                      setDocumentos(prev => ({ ...prev, cnis: !!checked }))
                    }
                  />
                  <Label htmlFor="doc_cnis" className="flex-1 cursor-pointer">
                    CNIS
                  </Label>
                  {documentos.cnis && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="doc_ctps"
                    checked={documentos.ctps}
                    onCheckedChange={(checked) => 
                      setDocumentos(prev => ({ ...prev, ctps: !!checked }))
                    }
                  />
                  <Label htmlFor="doc_ctps" className="flex-1 cursor-pointer">
                    CTPS
                  </Label>
                  {documentos.ctps && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="doc_certidao"
                    checked={documentos.certidao}
                    onCheckedChange={(checked) => 
                      setDocumentos(prev => ({ ...prev, certidao: !!checked }))
                    }
                  />
                  <Label htmlFor="doc_certidao" className="flex-1 cursor-pointer">
                    Certidão (Nascimento/Adoção)
                  </Label>
                  {documentos.certidao && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="doc_comprov"
                    checked={documentos.comprov_endereco}
                    onCheckedChange={(checked) => 
                      setDocumentos(prev => ({ ...prev, comprov_endereco: !!checked }))
                    }
                  />
                  <Label htmlFor="doc_comprov" className="flex-1 cursor-pointer">
                    Comprovante de Endereço
                  </Label>
                  {documentos.comprov_endereco && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {totalDocs} documento{totalDocs !== 1 ? "s" : ""} marcado{totalDocs !== 1 ? "s" : ""}
                {!hasMinDocs && " • CNIS ou CTPS obrigatório"}
              </p>
            </div>

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
                  Analisando...
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
                ⚠️ Sem CNIS ou CTPS a análise será reprovada automaticamente
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