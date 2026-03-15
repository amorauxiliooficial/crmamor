import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer, Download, Calendar, CheckCircle2, Clock, ArrowUpCircle, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  backlog: { label: "Backlog", color: "bg-muted text-muted-foreground", icon: Layers },
  priorizado: { label: "Priorizado", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: ArrowUpCircle },
  em_progresso: { label: "Em Progresso", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
  concluido: { label: "Concluído", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2 },
};

const PRIORIDADE_CONFIG: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-muted text-muted-foreground" },
  media: { label: "Média", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  urgente: { label: "Urgente", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

const CATEGORIA_LABELS: Record<string, string> = {
  bug: "🐛 Bug",
  melhoria: "✨ Melhoria",
  nova_feature: "🚀 Nova Feature",
  infra: "⚙️ Infra",
  design: "🎨 Design",
};

interface TarefaRelatorio {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  categoria: string;
  created_at: string;
  concluido_at: string | null;
  em_progresso_at: string | null;
  priorizado_at: string | null;
  updated_at: string;
  responsaveis: string[];
}

export default function RelatorioSemanal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const now = new Date();
  const refDate = weekOffset === 0 ? now : (weekOffset > 0 ? addWeeks(now, weekOffset) : subWeeks(now, Math.abs(weekOffset)));
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["relatorio_semanal_dev", weekStart.toISOString()],
    queryFn: async () => {
      // Fetch tasks that were updated/created/completed during this week
      const { data, error } = await supabase
        .from("tarefas_internas")
        .select("id, titulo, descricao, status, prioridade, categoria, created_at, concluido_at, em_progresso_at, priorizado_at, updated_at")
        .or(`updated_at.gte.${weekStart.toISOString()},created_at.gte.${weekStart.toISOString()}`)
        .lte("created_at", weekEnd.toISOString())
        .order("updated_at", { ascending: true });

      if (error) throw error;

      // Fetch responsaveis
      const tarefaIds = (data || []).map((t: any) => t.id);
      const { data: responsaveis } = await supabase
        .from("tarefa_responsaveis")
        .select("tarefa_id, user_id")
        .in("tarefa_id", tarefaIds.length > 0 ? tarefaIds : ["00000000-0000-0000-0000-000000000000"]);

      // Fetch profiles for names
      const userIds = [...new Set((responsaveis || []).map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || p.email || "—"]));
      const respMap = new Map<string, string[]>();
      (responsaveis || []).forEach((r: any) => {
        const list = respMap.get(r.tarefa_id) || [];
        list.push(profileMap.get(r.user_id) || "—");
        respMap.set(r.tarefa_id, list);
      });

      // Filter to only tasks that had activity within the week
      return (data || [])
        .filter((t: any) => {
          const updated = new Date(t.updated_at);
          const created = new Date(t.created_at);
          const concluded = t.concluido_at ? new Date(t.concluido_at) : null;
          const inProgress = t.em_progresso_at ? new Date(t.em_progresso_at) : null;

          return (
            (updated >= weekStart && updated <= weekEnd) ||
            (created >= weekStart && created <= weekEnd) ||
            (concluded && concluded >= weekStart && concluded <= weekEnd) ||
            (inProgress && inProgress >= weekStart && inProgress <= weekEnd)
          );
        })
        .map((t: any) => ({
          ...t,
          responsaveis: respMap.get(t.id) || [],
        })) as TarefaRelatorio[];
    },
  });

  // Get the most relevant date for a task in the week
  const getActivityDate = (t: TarefaRelatorio): Date => {
    if (t.concluido_at && new Date(t.concluido_at) >= weekStart) return new Date(t.concluido_at);
    if (t.em_progresso_at && new Date(t.em_progresso_at) >= weekStart) return new Date(t.em_progresso_at);
    if (new Date(t.updated_at) >= weekStart) return new Date(t.updated_at);
    return new Date(t.created_at);
  };

  // Group by day
  const byDay = daysOfWeek.map((day) => ({
    day,
    items: tarefas.filter((t) => isSameDay(getActivityDate(t), day)),
  }));

  // Summary by status
  const summaryByStatus = tarefas.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  // Summary by categoria
  const summaryByCategoria = tarefas.reduce<Record<string, number>>((acc, t) => {
    acc[t.categoria] = (acc[t.categoria] || 0) + 1;
    return acc;
  }, {});

  const concluidas = tarefas.filter((t) => t.status === "concluido").length;

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const headers = ["Data", "Título", "Status", "Prioridade", "Categoria", "Responsáveis", "Descrição"];
    const rows = tarefas.map((t) => [
      format(getActivityDate(t), "dd/MM/yyyy"),
      t.titulo,
      STATUS_CONFIG[t.status]?.label || t.status,
      PRIORIDADE_CONFIG[t.prioridade]?.label || t.prioridade,
      CATEGORIA_LABELS[t.categoria] || t.categoria,
      t.responsaveis.join(", "),
      (t.descricao || "").replace(/[\n\r]/g, " "),
    ]);

    const csvContent = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-desenvolvimento-${format(weekStart, "dd-MM-yyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="print:hidden border-b bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Relatório de Desenvolvimento</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="default" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6" ref={printRef}>
        {/* Week selector */}
        <div className="print:hidden flex items-center justify-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((p) => p - 1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(weekStart, "dd/MM", { locale: ptBR })} — {format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((p) => p + 1)} disabled={weekOffset >= 0}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Print header */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-xl font-bold">Relatório de Desenvolvimento Semanal</h1>
          <p className="text-sm text-muted-foreground">
            Período: {format(weekStart, "dd/MM/yyyy")} a {format(weekEnd, "dd/MM/yyyy")}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{tarefas.length}</p>
              <p className="text-xs text-muted-foreground">Tarefas Movimentadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{concluidas}</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{summaryByStatus["em_progresso"] || 0}</p>
              <p className="text-xs text-muted-foreground">Em Progresso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{summaryByStatus["priorizado"] || 0}</p>
              <p className="text-xs text-muted-foreground">Priorizadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Category breakdown */}
        {Object.keys(summaryByCategoria).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {Object.entries(summaryByCategoria).map(([cat, count]) => (
                <Badge key={cat} variant="secondary" className="text-xs">
                  {CATEGORIA_LABELS[cat] || cat}: {count}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Daily breakdown */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : (
          byDay.map(({ day, items }) => (
            <div key={day.toISOString()} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm capitalize">
                  {format(day, "EEEE, dd/MM", { locale: ptBR })}
                </h3>
                <Badge variant={items.length > 0 ? "default" : "outline"} className="text-xs">
                  {items.length} {items.length === 1 ? "tarefa" : "tarefas"}
                </Badge>
              </div>

              {items.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarefa</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead className="w-24 hidden md:table-cell">Prioridade</TableHead>
                        <TableHead className="w-28 hidden md:table-cell">Categoria</TableHead>
                        <TableHead className="w-32 hidden lg:table-cell">Responsáveis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((t) => {
                        const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.backlog;
                        const prioCfg = PRIORIDADE_CONFIG[t.prioridade] || PRIORIDADE_CONFIG.media;
                        const StatusIcon = statusCfg.icon;
                        return (
                          <TableRow key={t.id}>
                            <TableCell>
                              <p className="text-sm font-medium">{t.titulo}</p>
                              {t.descricao && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.descricao}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${statusCfg.color} border-0`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className={`text-xs ${prioCfg.color} border-0`}>
                                {prioCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs">
                              {CATEGORIA_LABELS[t.categoria] || t.categoria}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                              {t.responsaveis.length > 0 ? t.responsaveis.join(", ") : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic pl-2">Nenhuma movimentação</p>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
          .hidden.md\\:table-cell { display: table-cell !important; }
          .hidden.lg\\:table-cell { display: table-cell !important; }
        }
      `}</style>
    </div>
  );
}
