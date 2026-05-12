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
  Copy,
  Key,
} from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConferenciaDialog } from "@/components/conferencia/ConferenciaDialog";
import { ConferenciaHistorico } from "@/components/conferencia/ConferenciaHistorico";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  senha_gov?: string | null;
  status_processo: string;
  data_ultima_atualizacao: string;
  ultima_conferencia?: string;
  ultima_conferencia_user?: string | null;
  dias_sem_conferencia: number;
  precisa_conferencia: boolean;
  user_id: string;
}

const INTERVALO_POR_STATUS: Record<string, number> = {
  "Aguardando Análise INSS": 3,
  "Em Análise": 3,
  "Aprovada": 3,
};
const CONFERENCIA_INTERVALO_DIAS_DEFAULT = 3;

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
  const [statusTab, setStatusTab] = useState<"aguardando" | "aprovada">("aguardando");

  const fetchMaesEmAnalise = async () => {
    setLoading(true);

    const { data: maesData, error: maesError } = await supabase
      .from("mae_processo")
      .select("id, nome_mae, cpf, senha_gov, status_processo, data_ultima_atualizacao, user_id")
      .in("status_processo", ["Aguardando Análise INSS", "Em Análise", "Aprovada"])
      .order("data_ultima_atualizacao", { ascending: true });

    if (maesError) {
      logError('fetch_maes_em_analise', maesError);
      setLoading(false);
      return;
    }

    const maeIds = (maesData || []).map((m) => m.id);

    // Buscar última conferência de cada mãe (com user_id)
    const { data: confs } = await supabase
      .from("conferencia_inss")
      .select("mae_id, created_at, user_id")
      .in("mae_id", maeIds)
      .order("created_at", { ascending: false });

    const ultimaPorMae = new Map<string, { created_at: string; user_id: string }>();
    (confs || []).forEach((c: any) => {
      if (!ultimaPorMae.has(c.mae_id)) {
        ultimaPorMae.set(c.mae_id, { created_at: c.created_at, user_id: c.user_id });
      }
    });

    // Buscar nomes dos usuários que fizeram a última conferência
    const userIds = Array.from(new Set(Array.from(ultimaPorMae.values()).map((c) => c.user_id).filter(Boolean)));
    const profileMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      (profiles || []).forEach((p: any) => {
        profileMap.set(p.id, p.full_name || p.email || "Usuário");
      });
    }

    const maesWithConferencia: MaeEmAnalise[] = (maesData || []).map((mae) => {
      const ult = ultimaPorMae.get(mae.id);
      const ultimaConferencia = ult?.created_at;
      const diasSemConferencia = ultimaConferencia
        ? differenceInDays(new Date(), new Date(ultimaConferencia))
        : 999;
      const limite = INTERVALO_POR_STATUS[mae.status_processo] ?? CONFERENCIA_INTERVALO_DIAS_DEFAULT;
      const precisaConferencia = diasSemConferencia >= limite;

      return {
        id: mae.id,
        nome_mae: mae.nome_mae,
        cpf: mae.cpf,
        senha_gov: (mae as any).senha_gov ?? null,
        status_processo: mae.status_processo,
        data_ultima_atualizacao: mae.data_ultima_atualizacao,
        ultima_conferencia: ultimaConferencia,
        ultima_conferencia_user: ult?.user_id ? profileMap.get(ult.user_id) ?? null : null,
        dias_sem_conferencia: diasSemConferencia,
        precisa_conferencia: precisaConferencia,
        user_id: mae.user_id,
      };
    });

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

    // Filter by status tab
    if (statusTab === "aguardando") {
      filtered = filtered.filter((m) =>
        ["Aguardando Análise INSS", "Em Análise"].includes(m.status_processo)
      );
    } else {
      filtered = filtered.filter((m) => m.status_processo === "Aprovada");
    }

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
  }, [maes, searchQuery, selectedUserId, statusTab]);

  const tabCounts = useMemo(() => {
    const aguardando = maes.filter((m) =>
      ["Aguardando Análise INSS", "Em Análise"].includes(m.status_processo)
    ).length;
    const aprovada = maes.filter((m) => m.status_processo === "Aprovada").length;
    return { aguardando, aprovada };
  }, [maes]);

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

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      sonnerToast.success(`${label} copiado!`);
    } catch {
      sonnerToast.error("Erro ao copiar");
    }
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
      {/* Status Tabs */}
      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as "aguardando" | "aprovada")}>
        <TabsList>
          <TabsTrigger value="aguardando">
            Aguardando Análise INSS ({tabCounts.aguardando})
          </TabsTrigger>
          <TabsTrigger value="aprovada">
            Aprovada ({tabCounts.aprovada})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-card border border-border border-l-4 border-l-primary p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {statusTab === "aguardando" ? "Aguardando Análise INSS" : "Aprovada"}
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-foreground tabular-nums">
              {String(stats.total).padStart(2, "0")}
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary)/0.6)]" />
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border border-l-4 border-l-destructive p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-destructive/80">
            Pendentes de Conferência
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-foreground tabular-nums">
              {String(stats.pendentes).padStart(2, "0")}
            </span>
            {stats.pendentes > 0 && (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border border-l-4 border-l-emerald-500 p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500/80">
            Em Dia
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-foreground tabular-nums">
              {String(stats.emDia).padStart(2, "0")}
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Identidade</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Credenciais</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Última Conferência</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <p className="text-muted-foreground">
                      {maes.length === 0
                        ? "Nenhuma mãe aguardando análise INSS"
                        : "Nenhum resultado para a busca"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaes.map((mae) => (
                  <TableRow key={mae.id} className="group transition-colors">
                    <TableCell className="py-4">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {mae.nome_mae}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] text-foreground/90">
                            {formatCpf(mae.cpf)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                            onClick={() => copyValue(mae.cpf.replace(/\D/g, ""), "CPF")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {mae.senha_gov && (
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                              <span className="text-[10px] font-bold uppercase tracking-tighter text-primary">
                                Gov.br
                              </span>
                            </span>
                            <span className="font-mono text-[12px] text-muted-foreground">
                              {mae.senha_gov}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                              onClick={() => copyValue(mae.senha_gov!, "Senha Gov")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex justify-center">
                        {mae.precisa_conferencia ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-[11px] font-bold border border-destructive/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                            PENDENTE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            EM DIA
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {mae.ultima_conferencia ? (
                        <div>
                          <div className="text-sm font-medium text-foreground tabular-nums">
                            {format(new Date(mae.ultima_conferencia), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {mae.dias_sem_conferencia === 0
                              ? "Hoje"
                              : `${mae.dias_sem_conferencia} dia(s) atrás`}
                            {mae.ultima_conferencia_user && (
                              <>
                                {" "}por <span className="text-primary/80 font-medium">{mae.ultima_conferencia_user}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">
                          Nunca conferido
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleHistorico(mae)}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Histórico
                        </button>
                        <Button
                          size="sm"
                          onClick={() => handleConferencia(mae)}
                          className="rounded-lg font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
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
        </div>
      </div>

      {/* Conferencia Dialog */}
      {selectedMae && (
        <ConferenciaDialog
          open={conferenciaDialogOpen}
          onOpenChange={setConferenciaDialogOpen}
          maeId={selectedMae.id}
          maeNome={selectedMae.nome_mae}
          cpf={selectedMae.cpf}
          senhaGov={selectedMae.senha_gov ?? null}
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
