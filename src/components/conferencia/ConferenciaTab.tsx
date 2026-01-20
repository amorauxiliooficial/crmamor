import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ClipboardCheck,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConferenciaDialog } from "@/components/conferencia/ConferenciaDialog";
import { ConferenciaHistorico } from "@/components/conferencia/ConferenciaHistorico";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCpf } from "@/lib/formatters";

interface MaeEmAnalise {
  id: string;
  nome_mae: string;
  cpf: string;
  status_processo: string;
  data_ultima_atualizacao: string;
  ultima_conferencia?: string;
  dias_sem_conferencia: number;
  precisa_conferencia: boolean;
  user_id: string;
}

const CONFERENCIA_INTERVALO_DIAS = 2;

interface ConferenciaTabProps {
  searchQuery: string;
  selectedUserId?: string;
}

export function ConferenciaTab({ searchQuery, selectedUserId }: ConferenciaTabProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [maes, setMaes] = useState<MaeEmAnalise[]>([]);
  const [conferenciaDialogOpen, setConferenciaDialogOpen] = useState(false);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [selectedMae, setSelectedMae] = useState<MaeEmAnalise | null>(null);

  const fetchMaesEmAnalise = async () => {
    setLoading(true);

    const { data: maesData, error: maesError } = await supabase
      .from("mae_processo")
      .select("id, nome_mae, cpf, status_processo, data_ultima_atualizacao, user_id")
      .eq("status_processo", "Em Análise")
      .order("data_ultima_atualizacao", { ascending: true });

    if (maesError) {
      logError('fetch_maes_em_analise', maesError);
      setLoading(false);
      return;
    }

    const maesWithConferencia: MaeEmAnalise[] = await Promise.all(
      (maesData || []).map(async (mae) => {
        const { data: confData } = await supabase
          .from("conferencia_inss")
          .select("created_at")
          .eq("mae_id", mae.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const ultimaConferencia = confData?.created_at;
        const diasSemConferencia = ultimaConferencia
          ? differenceInDays(new Date(), new Date(ultimaConferencia))
          : 999;
        const precisaConferencia = diasSemConferencia >= CONFERENCIA_INTERVALO_DIAS;

        return {
          id: mae.id,
          nome_mae: mae.nome_mae,
          cpf: mae.cpf,
          status_processo: mae.status_processo,
          data_ultima_atualizacao: mae.data_ultima_atualizacao,
          ultima_conferencia: ultimaConferencia,
          dias_sem_conferencia: diasSemConferencia,
          precisa_conferencia: precisaConferencia,
          user_id: mae.user_id,
        };
      })
    );

    maesWithConferencia.sort((a, b) => {
      if (a.precisa_conferencia && !b.precisa_conferencia) return -1;
      if (!a.precisa_conferencia && b.precisa_conferencia) return 1;
      return b.dias_sem_conferencia - a.dias_sem_conferencia;
    });

    setMaes(maesWithConferencia);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchMaesEmAnalise();
    }
  }, [user]);

  const filteredMaes = useMemo(() => {
    let filtered = maes;
    
    // Filter by user if selected
    if (selectedUserId && selectedUserId !== "all") {
      filtered = filtered.filter((mae) => mae.user_id === selectedUserId);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (mae) =>
          mae.nome_mae.toLowerCase().includes(query) ||
          mae.cpf.includes(query)
      );
    }
    
    return filtered;
  }, [maes, searchQuery, selectedUserId]);

  const stats = useMemo(() => {
    const dataToCount = filteredMaes;
    const pendentes = dataToCount.filter((m) => m.precisa_conferencia).length;
    const emDia = dataToCount.filter((m) => !m.precisa_conferencia).length;
    return { pendentes, emDia, total: dataToCount.length };
  }, [filteredMaes]);

  const handleConferencia = (mae: MaeEmAnalise) => {
    setSelectedMae(mae);
    setConferenciaDialogOpen(true);
  };

  const handleHistorico = (mae: MaeEmAnalise) => {
    setSelectedMae(mae);
    setHistoricoDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total em Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Pendentes de Conferência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">
                {stats.pendentes}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">
              Em Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold text-emerald-600">
                {stats.emDia}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Última Conferência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-muted-foreground">
                    {maes.length === 0
                      ? "Nenhuma mãe em análise encontrada"
                      : "Nenhum resultado para a busca"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredMaes.map((mae) => (
                <TableRow key={mae.id}>
                  <TableCell className="font-medium">{mae.nome_mae}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatCpf(mae.cpf)}
                  </TableCell>
                  <TableCell>
                    {mae.ultima_conferencia ? (
                      <div className="text-sm">
                        <div>
                          {format(
                            new Date(mae.ultima_conferencia),
                            "dd/MM/yyyy",
                            { locale: ptBR }
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {mae.dias_sem_conferencia === 0
                            ? "Hoje"
                            : `${mae.dias_sem_conferencia} dia(s) atrás`}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Nunca conferido
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {mae.precisa_conferencia ? (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/20 text-emerald-600"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Em dia
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleHistorico(mae)}
                      >
                        Histórico
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleConferencia(mae)}
                      >
                        <ClipboardCheck className="h-4 w-4 mr-1" />
                        Conferir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Conferencia Dialog */}
      {selectedMae && (
        <ConferenciaDialog
          open={conferenciaDialogOpen}
          onOpenChange={setConferenciaDialogOpen}
          maeId={selectedMae.id}
          maeNome={selectedMae.nome_mae}
          onSuccess={fetchMaesEmAnalise}
        />
      )}

      {/* Historico Dialog */}
      {selectedMae && (
        <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Histórico de Conferências</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {selectedMae.nome_mae}
              </p>
            </DialogHeader>
            <ConferenciaHistorico maeId={selectedMae.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
