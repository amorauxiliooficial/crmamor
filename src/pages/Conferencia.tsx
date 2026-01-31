import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errorHandler";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ClipboardCheck,
} from "lucide-react";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConferenciaDialog } from "@/components/conferencia/ConferenciaDialog";
import { ConferenciaHistorico } from "@/components/conferencia/ConferenciaHistorico";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MaeEmAnalise {
  id: string;
  nome_mae: string;
  cpf: string;
  status_processo: string;
  data_ultima_atualizacao: string;
  ultima_conferencia?: string;
  dias_sem_conferencia: number;
  precisa_conferencia: boolean;
}

const CONFERENCIA_INTERVALO_DIAS = 2; // A cada 2 dias

export default function Conferencia() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [maes, setMaes] = useState<MaeEmAnalise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [conferenciaDialogOpen, setConferenciaDialogOpen] = useState(false);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [selectedMae, setSelectedMae] = useState<MaeEmAnalise | null>(null);

  const fetchMaesEmAnalise = async () => {
    setLoading(true);

    // Fetch mães with status "Em Análise"
    const { data: maesData, error: maesError } = await supabase
      .from("mae_processo")
      .select("id, nome_mae, cpf, status_processo, data_ultima_atualizacao")
      .eq("status_processo", "Em Análise")
      .order("data_ultima_atualizacao", { ascending: true });

    if (maesError) {
      logError('fetch_maes_em_analise', maesError);
      setLoading(false);
      return;
    }

    // Fetch latest conferencia for each mae
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
        };
      })
    );

    // Sort: pendentes first, then by dias_sem_conferencia desc
    maesWithConferencia.sort((a, b) => {
      if (a.precisa_conferencia && !b.precisa_conferencia) return -1;
      if (!a.precisa_conferencia && b.precisa_conferencia) return 1;
      return b.dias_sem_conferencia - a.dias_sem_conferencia;
    });

    setMaes(maesWithConferencia);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMaesEmAnalise();
    }
  }, [user]);

  const filteredMaes = useMemo(() => {
    if (!searchQuery.trim()) return maes;

    const query = searchQuery.toLowerCase();
    return maes.filter(
      (mae) =>
        mae.nome_mae.toLowerCase().includes(query) ||
        mae.cpf.includes(query)
    );
  }, [maes, searchQuery]);

  const stats = useMemo(() => {
    const pendentes = maes.filter((m) => m.precisa_conferencia).length;
    const emDia = maes.filter((m) => !m.precisa_conferencia).length;
    return { pendentes, emDia, total: maes.length };
  }, [maes]);

  const handleConferencia = (mae: MaeEmAnalise) => {
    setSelectedMae(mae);
    setConferenciaDialogOpen(true);
  };

  const handleHistorico = (mae: MaeEmAnalise) => {
    setSelectedMae(mae);
    setHistoricoDialogOpen(true);
  };

  const formatCpf = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, "");
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="p-3 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 md:h-10 md:w-10 shrink-0">
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <div>
              <h1 className="text-lg md:text-2xl font-bold">Conferência INSS</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Intervalo: {CONFERENCIA_INTERVALO_DIAS} dias
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Card>
            <CardHeader className="pb-2 p-3 md:p-4">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span className="text-xl md:text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader className="pb-2 p-3 md:p-4">
              <CardTitle className="text-xs md:text-sm font-medium text-destructive">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
                <span className="text-xl md:text-2xl font-bold text-destructive">
                  {stats.pendentes}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/50">
            <CardHeader className="pb-2 p-3 md:p-4">
              <CardTitle className="text-xs md:text-sm font-medium text-emerald-600">
                Em Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
                <span className="text-xl md:text-2xl font-bold text-emerald-600">
                  {stats.emDia}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 md:h-10"
          />
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-2">
          {filteredMaes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {maes.length === 0
                ? "Nenhuma mãe em análise encontrada"
                : "Nenhum resultado para a busca"}
            </div>
          ) : (
            filteredMaes.map((mae) => (
              <Card key={mae.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{mae.nome_mae}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{formatCpf(mae.cpf)}</p>
                    </div>
                    {mae.precisa_conferencia ? (
                      <Badge variant="destructive" className="text-[10px] shrink-0">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                        Pendente
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-600 text-[10px] shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        Em dia
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-3">
                    {mae.ultima_conferencia ? (
                      <>
                        Última: {format(new Date(mae.ultima_conferencia), "dd/MM/yyyy", { locale: ptBR })}
                        {" · "}
                        {mae.dias_sem_conferencia === 0 ? "Hoje" : `${mae.dias_sem_conferencia} dia(s)`}
                      </>
                    ) : (
                      "Nunca conferido"
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleHistorico(mae)}
                    >
                      Histórico
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleConferencia(mae)}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                      Conferir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <Card className="hidden md:block">
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
      </main>

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
