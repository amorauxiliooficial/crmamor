import { useState, useEffect, useMemo } from "react";
import { MaeProcesso } from "@/types/mae";
import { supabase } from "@/integrations/supabase/client";
import { differenceInMonths, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle2, Clock, User, Calendar, AlertTriangle, History } from "lucide-react";
import { VerificacaoGestanteDialog } from "./VerificacaoGestanteDialog";
import { cn } from "@/lib/utils";

interface GestantesNotificacaoProps {
  maes: MaeProcesso[];
  onRefresh: () => void;
}

interface VerificacaoRecord {
  id: string;
  mae_id: string;
  verificado_em: string;
  atualizacao_realizada: string;
  observacoes: string | null;
}

function calcularMesGravidez(dataEvento: string | undefined, dataEventoTipo: string | undefined): number | null {
  if (!dataEvento || dataEventoTipo !== "DPP") return null;
  
  const dpp = parseISO(dataEvento);
  const hoje = new Date();
  
  if (dpp < hoje) return null;
  
  const mesesAteParto = differenceInMonths(dpp, hoje);
  const mesGravidez = Math.max(1, Math.min(9, 9 - mesesAteParto));
  
  return mesGravidez;
}

export function GestantesNotificacao({ maes, onRefresh }: GestantesNotificacaoProps) {
  const [verificacoes, setVerificacoes] = useState<VerificacaoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMae, setSelectedMae] = useState<MaeProcesso | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchVerificacoes = async () => {
    const { data, error } = await supabase
      .from("verificacao_gestante")
      .select("*")
      .order("verificado_em", { ascending: false });

    if (!error && data) {
      setVerificacoes(data as VerificacaoRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVerificacoes();
  }, []);

  // Gestantes no 7º mês
  const gestantes7Mes = useMemo(() => {
    return maes.filter((mae) => {
      const mes = calcularMesGravidez(mae.data_evento, mae.data_evento_tipo);
      return mes === 7;
    });
  }, [maes]);

  // Verificar quais gestantes já foram verificadas recentemente (últimos 7 dias)
  const gestantesComStatus = useMemo(() => {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    return gestantes7Mes.map((mae) => {
      const verificacoesRecentes = verificacoes.filter(
        (v) => v.mae_id === mae.id && new Date(v.verificado_em) >= seteDiasAtras
      );
      const ultimaVerificacao = verificacoes.find((v) => v.mae_id === mae.id);
      
      return {
        mae,
        verificadaRecentemente: verificacoesRecentes.length > 0,
        ultimaVerificacao,
      };
    });
  }, [gestantes7Mes, verificacoes]);

  const pendentes = gestantesComStatus.filter((g) => !g.verificadaRecentemente);
  const verificadas = gestantesComStatus.filter((g) => g.verificadaRecentemente);

  const handleVerificar = (mae: MaeProcesso) => {
    setSelectedMae(mae);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchVerificacoes();
    onRefresh();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Últimas verificações realizadas (todas, não só 7º mês)
  const ultimasVerificacoes = useMemo(() => {
    return verificacoes.slice(0, 10).map((v) => {
      const mae = maes.find((m) => m.id === v.mae_id);
      return { ...v, mae };
    });
  }, [verificacoes, maes]);

  return (
    <div className="space-y-6">
      {/* Header com contadores */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Notificações - Gestantes 7º Mês</h3>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {verificadas.length} verificada{verificadas.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {gestantes7Mes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Nenhuma gestante no 7º mês no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pendentes */}
          <Card className={cn(pendentes.length > 0 && "border-destructive/50")}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Aguardando Verificação ({pendentes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {pendentes.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Todas as gestantes foram verificadas!
                    </p>
                  ) : (
                    pendentes.map(({ mae, ultimaVerificacao }) => (
                      <div
                        key={mae.id}
                        className="flex items-center justify-between rounded-lg border bg-card p-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{mae.nome_mae}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            DPP: {mae.data_evento ? format(parseISO(mae.data_evento), "dd/MM/yyyy") : "-"}
                          </div>
                          {ultimaVerificacao && (
                            <p className="text-xs text-muted-foreground">
                              Última: {format(new Date(ultimaVerificacao.verificado_em), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <Button size="sm" onClick={() => handleVerificar(mae)}>
                          Verificar
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Verificadas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Verificadas Recentemente ({verificadas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {verificadas.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Nenhuma verificação recente.
                    </p>
                  ) : (
                    verificadas.map(({ mae, ultimaVerificacao }) => (
                      <div
                        key={mae.id}
                        className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{mae.nome_mae}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {ultimaVerificacao && format(new Date(ultimaVerificacao.verificado_em), "dd/MM", { locale: ptBR })}
                          </Badge>
                        </div>
                        {ultimaVerificacao && (
                          <div className="text-xs text-muted-foreground">
                            <p className="font-medium text-foreground">Atualização:</p>
                            <p className="line-clamp-2">{ultimaVerificacao.atualizacao_realizada}</p>
                          </div>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => handleVerificar(mae)}
                        >
                          Nova Verificação
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Atividades Recentes - Nova seção */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px]">
            <div className="space-y-3">
              {ultimasVerificacoes.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhuma atividade registrada ainda.
                </p>
              ) : (
                ultimasVerificacoes.map((verificacao) => (
                  <div
                    key={verificacao.id}
                    className="rounded-lg border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium text-sm">
                          {verificacao.mae?.nome_mae || "Mãe não encontrada"}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(verificacao.verificado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </Badge>
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Atualização realizada:</span>
                      </p>
                      <p className="text-foreground bg-muted/50 rounded p-2">
                        {verificacao.atualizacao_realizada}
                      </p>
                      {verificacao.observacoes && (
                        <>
                          <p className="text-muted-foreground mt-2">
                            <span className="font-medium text-foreground">Observações:</span>
                          </p>
                          <p className="text-muted-foreground italic">
                            {verificacao.observacoes}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <VerificacaoGestanteDialog
        mae={selectedMae}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
