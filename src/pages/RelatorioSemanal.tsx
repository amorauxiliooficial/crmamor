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
import { ArrowLeft, ChevronLeft, ChevronRight, Printer, Download, Calendar, CheckCircle2, Clock, ArrowUpCircle, Layers, Sparkles, Bug, Wrench, Database, Paintbrush } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  backlog: { label: "Backlog", color: "bg-muted text-muted-foreground", icon: Layers },
  priorizado: { label: "Priorizado", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: ArrowUpCircle },
  em_progresso: { label: "Em Progresso", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
  concluido: { label: "Concluído", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2 },
};

const CATEGORIA_CONFIG: Record<string, { label: string; icon: typeof Sparkles; emoji: string }> = {
  nova_feature: { label: "Nova Feature", icon: Sparkles, emoji: "🚀" },
  melhoria: { label: "Melhoria", icon: Wrench, emoji: "✨" },
  bug: { label: "Correção de Bug", icon: Bug, emoji: "🐛" },
  infra: { label: "Infra / Banco", icon: Database, emoji: "⚙️" },
  design: { label: "Design", icon: Paintbrush, emoji: "🎨" },
};

const PRIORIDADE_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
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
    queryKey: ["relatorio_dev_semanal", weekStart.toISOString()],
    queryFn: async () => {
      // Fetch all tasks - we'll filter client-side for flexibility
      const { data, error } = await supabase
        .from("tarefas_internas")
        .select("id, titulo, descricao, status, prioridade, categoria, created_at, concluido_at, em_progresso_at, priorizado_at, updated_at")
        .order("updated_at", { ascending: true });

      if (error) throw error;

      // Filter tasks that had any activity during the week
      const filtered = (data || []).filter((t: any) => {
        const dates = [
          t.updated_at,
          t.created_at,
          t.concluido_at,
          t.em_progresso_at,
          t.priorizado_at,
        ].filter(Boolean).map((d: string) => new Date(d));

        return dates.some((d) => d >= weekStart && d <= weekEnd);
      });

      // Fetch responsaveis for filtered tasks
      const tarefaIds = filtered.map((t: any) => t.id);
      if (tarefaIds.length === 0) return [];

      const { data: responsaveis } = await supabase
        .from("tarefa_responsaveis")
        .select("tarefa_id, user_id")
        .in("tarefa_id", tarefaIds);

      const userIds = [...new Set((responsaveis || []).map((r: any) => r.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || p.email?.split("@")[0] || "—"]));
      const respMap = new Map<string, string[]>();
      (responsaveis || []).forEach((r: any) => {
        const list = respMap.get(r.tarefa_id) || [];
        list.push(profileMap.get(r.user_id) || "—");
        respMap.set(r.tarefa_id, list);
      });

      return filtered.map((t: any) => ({
        ...t,
        responsaveis: respMap.get(t.id) || [],
      })) as TarefaRelatorio[];
    },
  });

  // Get the most relevant date for a task in the week
  const getActivityDate = (t: TarefaRelatorio): Date => {
    // Priority: concluido > em_progresso > priorizado > updated > created
    const candidates = [
      { date: t.concluido_at, priority: 5 },
      { date: t.em_progresso_at, priority: 4 },
      { date: t.priorizado_at, priority: 3 },
      { date: t.updated_at, priority: 2 },
      { date: t.created_at, priority: 1 },
    ]
      .filter((c) => c.date && new Date(c.date) >= weekStart && new Date(c.date) <= weekEnd)
      .sort((a, b) => b.priority - a.priority);

    return candidates.length > 0 ? new Date(candidates[0].date!) : new Date(t.updated_at);
  };

  // Determine what happened to the task during the week
  const getActivityLabel = (t: TarefaRelatorio): string => {
    if (t.concluido_at && new Date(t.concluido_at) >= weekStart && new Date(t.concluido_at) <= weekEnd) return "Concluída";
    if (t.em_progresso_at && new Date(t.em_progresso_at) >= weekStart && new Date(t.em_progresso_at) <= weekEnd) return "Iniciada";
    if (t.priorizado_at && new Date(t.priorizado_at) >= weekStart && new Date(t.priorizado_at) <= weekEnd) return "Priorizada";
    if (new Date(t.created_at) >= weekStart && new Date(t.created_at) <= weekEnd) return "Criada";
    return "Atualizada";
  };

  // Group by day
  const byDay = daysOfWeek.map((day) => ({
    day,
    items: tarefas
      .filter((t) => isSameDay(getActivityDate(t), day))
      .sort((a, b) => getActivityDate(a).getTime() - getActivityDate(b).getTime()),
  }));

  // Summaries
  const concluidas = tarefas.filter((t) => t.concluido_at && new Date(t.concluido_at) >= weekStart).length;
  const iniciadas = tarefas.filter((t) => t.em_progresso_at && new Date(t.em_progresso_at) >= weekStart).length;
  const criadas = tarefas.filter((t) => new Date(t.created_at) >= weekStart && new Date(t.created_at) <= weekEnd).length;

  const summaryByCategoria = tarefas.reduce<Record<string, number>>((acc, t) => {
    acc[t.categoria] = (acc[t.categoria] || 0) + 1;
    return acc;
  }, {});

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const headers = ["Data", "Hora", "Ação", "Título", "Status", "Prioridade", "Categoria", "Responsáveis", "Descrição"];
    const rows = tarefas.map((t) => {
      const actDate = getActivityDate(t);
      return [
        format(actDate, "dd/MM/yyyy"),
        format(actDate, "HH:mm"),
        getActivityLabel(t),
        t.titulo,
        STATUS_CONFIG[t.status]?.label || t.status,
        PRIORIDADE_LABELS[t.prioridade] || t.prioridade,
        CATEGORIA_CONFIG[t.categoria]?.label || t.categoria,
        t.responsaveis.join(", "),
        (t.descricao || "").replace(/[\n\r]/g, " "),
      ];
    });

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
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={tarefas.length === 0}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="default" size="sm" onClick={handlePrint} disabled={tarefas.length === 0}>
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
          <p className="text-xs text-muted-foreground mt-1">Gerado automaticamente a partir do Roadmap</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{tarefas.length}</p>
              <p className="text-xs text-muted-foreground">Movimentações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-2xl font-bold">{concluidas}</span>
              </div>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">{iniciadas}</span>
              </div>
              <p className="text-xs text-muted-foreground">Iniciadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <span className="text-2xl font-bold">{criadas}</span>
              </div>
              <p className="text-xs text-muted-foreground">Novas</p>
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
              {Object.entries(summaryByCategoria).map(([cat, count]) => {
                const cfg = CATEGORIA_CONFIG[cat];
                return (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    {cfg?.emoji || "📌"} {cfg?.label || cat}: {count}
                  </Badge>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Daily breakdown */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : tarefas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma movimentação no Roadmap nesta semana</p>
            <p className="text-xs mt-1">As tarefas criadas, iniciadas ou concluídas no Roadmap aparecem aqui automaticamente</p>
          </div>
        ) : (
          byDay.map(({ day, items }) => {
            if (items.length === 0) return null;
            return (
              <div key={day.toISOString()} className="space-y-2 break-inside-avoid">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm capitalize">
                    {format(day, "EEEE, dd/MM", { locale: ptBR })}
                  </h3>
                  <Badge variant="default" className="text-xs">
                    {items.length} {items.length === 1 ? "tarefa" : "tarefas"}
                  </Badge>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Hora</TableHead>
                        <TableHead className="w-24">Ação</TableHead>
                        <TableHead>Tarefa</TableHead>
                        <TableHead className="w-28 hidden md:table-cell">Categoria</TableHead>
                        <TableHead className="w-32 hidden lg:table-cell">Responsáveis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((t) => {
                        const actDate = getActivityDate(t);
                        const actLabel = getActivityLabel(t);
                        const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.backlog;
                        const catCfg = CATEGORIA_CONFIG[t.categoria];
                        const StatusIcon = statusCfg.icon;
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs font-mono">
                              {format(actDate, "HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${statusCfg.color} border-0`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {actLabel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{t.titulo}</p>
                              {t.descricao && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.descricao}</p>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs">
                              {catCfg ? `${catCfg.emoji} ${catCfg.label}` : t.categoria}
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
              </div>
            );
          })
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
