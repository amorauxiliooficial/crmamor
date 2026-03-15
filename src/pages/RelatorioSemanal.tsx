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
import { ArrowLeft, ChevronLeft, ChevronRight, Printer, Download, Calendar, CheckCircle2, Clock, ArrowUpCircle, Layers, Sparkles, Bug, Wrench, Database, Paintbrush, Code2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  backlog: { label: "Backlog", color: "bg-muted text-muted-foreground", icon: Layers },
  priorizado: { label: "Priorizado", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: ArrowUpCircle },
  em_progresso: { label: "Em Progresso", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
  concluido: { label: "Concluído", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2 },
};

const CATEGORIA_CONFIG: Record<string, { label: string; emoji: string }> = {
  nova_feature: { label: "Nova Feature", emoji: "🚀" },
  melhoria: { label: "Melhoria", emoji: "✨" },
  bug: { label: "Correção de Bug", emoji: "🐛" },
  infra: { label: "Infra / Banco", emoji: "⚙️" },
  design: { label: "Design", emoji: "🎨" },
};

// Parse migration version (YYYYMMDDHHmmss) to Date
function versionToDate(version: string): Date {
  const y = version.slice(0, 4);
  const mo = version.slice(4, 6);
  const d = version.slice(6, 8);
  const h = version.slice(8, 10);
  const mi = version.slice(10, 12);
  const s = version.slice(12, 14);
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
}

// Summarize SQL statements into a readable title
function summarizeMigration(statements: string[]): string {
  const sql = (statements || []).join(" ").trim();
  
  const createTable = sql.match(/CREATE TABLE\s+(?:public\.)?(\w+)/i);
  if (createTable) return `Criação da tabela ${createTable[1]}`;

  const alterAdd = sql.match(/ALTER TABLE\s+(?:public\.)?(\w+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
  if (alterAdd) return `Nova coluna ${alterAdd[2]} em ${alterAdd[1]}`;

  const createFunc = sql.match(/CREATE\s+(?:OR REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)/i);
  if (createFunc) return `Função ${createFunc[1]}`;

  const createTrigger = sql.match(/CREATE TRIGGER\s+(\w+)/i);
  if (createTrigger) return `Trigger ${createTrigger[1]}`;

  const alterTable = sql.match(/ALTER TABLE\s+(?:public\.)?(\w+)/i);
  if (alterTable) return `Alteração na tabela ${alterTable[1]}`;

  if (sql.length > 80) return sql.slice(0, 80) + "...";
  return sql || "Migration";
}

interface ReportItem {
  id: string;
  date: Date;
  type: "roadmap" | "migration";
  title: string;
  description: string | null;
  status?: string;
  categoria?: string;
  actionLabel: string;
  responsaveis?: string[];
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

  // Format version strings for the RPC
  const vStart = format(weekStart, "yyyyMMddHHmmss");
  const vEnd = format(weekEnd, "yyyyMMddHHmmss");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["relatorio_dev_completo", weekStart.toISOString()],
    queryFn: async () => {
      // Fetch roadmap tasks and migrations in parallel
      const [tasksRes, migrationsRes] = await Promise.all([
        supabase
          .from("tarefas_internas")
          .select("id, titulo, descricao, status, prioridade, categoria, created_at, concluido_at, em_progresso_at, priorizado_at, updated_at")
          .order("updated_at", { ascending: true }),
        supabase.rpc("get_migrations_in_period", { p_start: vStart, p_end: vEnd }),
      ]);

      // Process roadmap tasks
      const tasks = (tasksRes.data || []).filter((t: any) => {
        const dates = [t.updated_at, t.created_at, t.concluido_at, t.em_progresso_at, t.priorizado_at]
          .filter(Boolean)
          .map((d: string) => new Date(d));
        return dates.some((d) => d >= weekStart && d <= weekEnd);
      });

      // Fetch responsaveis
      const tarefaIds = tasks.map((t: any) => t.id);
      let respMap = new Map<string, string[]>();
      if (tarefaIds.length > 0) {
        const { data: responsaveis } = await supabase
          .from("tarefa_responsaveis")
          .select("tarefa_id, user_id")
          .in("tarefa_id", tarefaIds);

        const userIds = [...new Set((responsaveis || []).map((r: any) => r.user_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
          const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || p.email?.split("@")[0] || "—"]));
          (responsaveis || []).forEach((r: any) => {
            const list = respMap.get(r.tarefa_id) || [];
            list.push(profileMap.get(r.user_id) || "—");
            respMap.set(r.tarefa_id, list);
          });
        }
      }

      // Build unified items
      const reportItems: ReportItem[] = [];

      // Add roadmap tasks
      tasks.forEach((t: any) => {
        let date: Date;
        let actionLabel: string;
        if (t.concluido_at && new Date(t.concluido_at) >= weekStart) {
          date = new Date(t.concluido_at); actionLabel = "Concluída";
        } else if (t.em_progresso_at && new Date(t.em_progresso_at) >= weekStart) {
          date = new Date(t.em_progresso_at); actionLabel = "Iniciada";
        } else if (t.priorizado_at && new Date(t.priorizado_at) >= weekStart) {
          date = new Date(t.priorizado_at); actionLabel = "Priorizada";
        } else if (new Date(t.created_at) >= weekStart && new Date(t.created_at) <= weekEnd) {
          date = new Date(t.created_at); actionLabel = "Criada";
        } else {
          date = new Date(t.updated_at); actionLabel = "Atualizada";
        }

        reportItems.push({
          id: t.id,
          date,
          type: "roadmap",
          title: t.titulo,
          description: t.descricao,
          status: t.status,
          categoria: t.categoria,
          actionLabel,
          responsaveis: respMap.get(t.id) || [],
        });
      });

      // Add migrations
      (migrationsRes.data || []).forEach((m: any) => {
        const date = versionToDate(m.version);
        const stmts: string[] = m.statements || [];
        
        // Skip the migration that created this function itself
        if (stmts.some((s: string) => s.includes("get_migrations_in_period"))) return;

        reportItems.push({
          id: `mig-${m.version}`,
          date,
          type: "migration",
          title: summarizeMigration(stmts),
          description: stmts.join("\n").slice(0, 200),
          actionLabel: "Migration",
          categoria: "infra",
        });
      });

      // Sort by date
      reportItems.sort((a, b) => a.date.getTime() - b.date.getTime());

      return reportItems;
    },
  });

  // Group by day
  const byDay = daysOfWeek.map((day) => ({
    day,
    items: items.filter((i) => isSameDay(i.date, day)),
  }));

  // Summaries
  const roadmapItems = items.filter((i) => i.type === "roadmap");
  const migrationItems = items.filter((i) => i.type === "migration");
  const concluidas = roadmapItems.filter((i) => i.actionLabel === "Concluída").length;

  const summaryByCategoria = items.reduce<Record<string, number>>((acc, i) => {
    if (i.categoria) acc[i.categoria] = (acc[i.categoria] || 0) + 1;
    return acc;
  }, {});

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const headers = ["Data", "Hora", "Origem", "Ação", "Título", "Categoria", "Responsáveis", "Descrição"];
    const rows = items.map((i) => [
      format(i.date, "dd/MM/yyyy"),
      format(i.date, "HH:mm"),
      i.type === "migration" ? "Banco de Dados" : "Roadmap",
      i.actionLabel,
      i.title,
      i.categoria ? (CATEGORIA_CONFIG[i.categoria]?.label || i.categoria) : "",
      (i.responsaveis || []).join(", "),
      (i.description || "").replace(/[\n\r]/g, " ").slice(0, 200),
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
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={items.length === 0}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="default" size="sm" onClick={handlePrint} disabled={items.length === 0}>
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
          <p className="text-xs text-muted-foreground mt-1">Dados do Roadmap + Alterações no Banco de Dados</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{items.length}</p>
              <p className="text-xs text-muted-foreground">Total Atividades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-2xl font-bold">{concluidas}</span>
              </div>
              <p className="text-xs text-muted-foreground">Tarefas Concluídas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">{migrationItems.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Alterações no Banco</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Layers className="h-5 w-5 text-amber-600" />
                <span className="text-2xl font-bold">{roadmapItems.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Tarefas Roadmap</p>
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
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma movimentação nesta semana</p>
            <p className="text-xs mt-1">Tarefas do Roadmap e alterações no banco aparecem aqui automaticamente</p>
          </div>
        ) : (
          byDay.map(({ day, items: dayItems }) => {
            if (dayItems.length === 0) return null;
            return (
              <div key={day.toISOString()} className="space-y-2 break-inside-avoid">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm capitalize">
                    {format(day, "EEEE, dd/MM", { locale: ptBR })}
                  </h3>
                  <Badge variant="default" className="text-xs">
                    {dayItems.length} {dayItems.length === 1 ? "item" : "itens"}
                  </Badge>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Hora</TableHead>
                        <TableHead className="w-24">Origem</TableHead>
                        <TableHead className="w-24">Ação</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-28 hidden md:table-cell">Categoria</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayItems.map((item) => {
                        const isMigration = item.type === "migration";
                        const statusCfg = item.status ? STATUS_CONFIG[item.status] : null;
                        const StatusIcon = statusCfg?.icon || (isMigration ? Code2 : Layers);
                        const badgeColor = isMigration
                          ? "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                          : (statusCfg?.color || "bg-muted text-muted-foreground");

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs font-mono">
                              {format(item.date, "HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${isMigration ? "border-violet-300 text-violet-700 dark:text-violet-300" : "border-blue-300 text-blue-700 dark:text-blue-300"} border`}>
                                {isMigration ? (
                                  <><Database className="h-3 w-3 mr-1" />Banco</>
                                ) : (
                                  <><Layers className="h-3 w-3 mr-1" />Roadmap</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${badgeColor} border-0`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {item.actionLabel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{item.title}</p>
                              {item.description && !isMigration && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs">
                              {item.categoria ? (
                                <span>{CATEGORIA_CONFIG[item.categoria]?.emoji || "📌"} {CATEGORIA_CONFIG[item.categoria]?.label || item.categoria}</span>
                              ) : "—"}
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
        }
      `}</style>
    </div>
  );
}
