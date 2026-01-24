import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History,
  Brain,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { usePreAnalise } from "@/hooks/usePreAnalise";
import { PreAnaliseResultCard } from "./PreAnaliseResultCard";
import { PreAnaliseFormDialog } from "./PreAnaliseFormDialog";
import {
  type PreAnalise,
  STATUS_ANALISE_LABELS,
  STATUS_ANALISE_COLORS,
  MOTIVO_REANALISE_LABELS,
} from "@/types/preAnalise";
import type { MaeProcesso } from "@/types/mae";

interface PreAnaliseHistoricoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mae: MaeProcesso;
}

export function PreAnaliseHistoricoDialog({
  open,
  onOpenChange,
  mae,
}: PreAnaliseHistoricoDialogProps) {
  const { buscarHistoricoAnalises } = usePreAnalise();
  const [historico, setHistorico] = useState<PreAnalise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnalise, setSelectedAnalise] = useState<PreAnalise | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);

  const loadHistorico = async () => {
    setIsLoading(true);
    const data = await buscarHistoricoAnalises(mae.id);
    setHistorico(data);
    if (data.length > 0) {
      setSelectedAnalise(data[0]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadHistorico();
    }
  }, [open, mae.id]);

  const handleNovaAnalise = (analise: PreAnalise) => {
    setHistorico(prev => [analise, ...prev]);
    setSelectedAnalise(analise);
    setShowFormDialog(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Análises
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {mae.nome_mae} - CPF: {mae.cpf}
            </p>
          </DialogHeader>

          <div className="flex justify-end">
            <Button onClick={() => setShowFormDialog(true)}>
              <Brain className="mr-2 h-4 w-4" />
              {historico.length > 0 ? "Nova Reanálise" : "Iniciar Análise"}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : historico.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Nenhuma análise realizada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clique em "Iniciar Análise" para executar a primeira pré-análise de elegibilidade.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="resultado" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="resultado">Resultado Atual</TabsTrigger>
                <TabsTrigger value="historico">
                  Histórico ({historico.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resultado" className="mt-4">
                {selectedAnalise && (
                  <PreAnaliseResultCard analise={selectedAnalise} />
                )}
              </TabsContent>

              <TabsContent value="historico" className="mt-4">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {historico.map((analise) => (
                      <div
                        key={analise.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedAnalise?.id === analise.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedAnalise(analise)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">v{analise.versao}</Badge>
                            <div>
                              <p className="text-sm font-medium">
                                {format(
                                  new Date(analise.processado_em || analise.created_at),
                                  "dd/MM/yyyy 'às' HH:mm",
                                  { locale: ptBR }
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {MOTIVO_REANALISE_LABELS[analise.motivo_reanalise]}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={STATUS_ANALISE_COLORS[analise.status_analise]}>
                              {STATUS_ANALISE_LABELS[analise.status_analise]}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <PreAnaliseFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        mae={mae}
        isReanalise={historico.length > 0}
        onSuccess={handleNovaAnalise}
      />
    </>
  );
}
