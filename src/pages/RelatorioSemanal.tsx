import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer, Download, Calendar, Plus, Sparkles, Bug, Wrench, Database, Paintbrush, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const TIPO_CONFIG: Record<string, { label: string; icon: typeof Sparkles; emoji: string }> = {
  nova_feature: { label: "Nova Feature", icon: Sparkles, emoji: "🚀" },
  melhoria: { label: "Melhoria", icon: Wrench, emoji: "✨" },
  bug: { label: "Correção de Bug", icon: Bug, emoji: "🐛" },
  infra: { label: "Infra / Banco", icon: Database, emoji: "⚙️" },
  design: { label: "Design", icon: Paintbrush, emoji: "🎨" },
};

interface DevLog {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  created_at: string;
  created_by: string | null;
  tarefa_roadmap_id: string | null;
}

export default function RelatorioSemanal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", tipo: "melhoria" });

  const now = new Date();
  const refDate = weekOffset === 0 ? now : (weekOffset > 0 ? addWeeks(now, weekOffset) : subWeeks(now, Math.abs(weekOffset)));
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["dev_logs", weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("desenvolvimento_log")
        .select("*")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as DevLog[];
    },
  });

  // Group by day
  const byDay = daysOfWeek.map((day) => ({
    day,
    items: logs.filter((l) => isSameDay(new Date(l.created_at), day)),
  }));

  // Summary by tipo
  const summaryByTipo = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.tipo] = (acc[l.tipo] || 0) + 1;
    return acc;
  }, {});

  const handleSave = async () => {
    if (!form.titulo.trim() || !user) return;
    setSaving(true);

    try {
      // 1. Create roadmap task as "concluido"
      const { data: tarefa, error: tarefaError } = await supabase
        .from("tarefas_internas")
        .insert({
          titulo: form.titulo,
          descricao: form.descricao || null,
          categoria: form.tipo as any,
          status: "concluido" as any,
          prioridade: "media" as any,
          created_by: user.id,
          concluido_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (tarefaError) throw tarefaError;

      // 2. Create dev log linked to the roadmap task
      const { error: logError } = await supabase
        .from("desenvolvimento_log")
        .insert({
          titulo: form.titulo,
          descricao: form.descricao || null,
          tipo: form.tipo,
          created_by: user.id,
          tarefa_roadmap_id: tarefa?.id || null,
        });

      if (logError) throw logError;

      toast.success("Desenvolvimento registrado e adicionado ao Roadmap!", { duration: 3000, position: "top-center" });
      setForm({ titulo: "", descricao: "", tipo: "melhoria" });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["dev_logs"] });
      queryClient.invalidateQueries({ queryKey: ["tarefas_internas"] });
    } catch (err: any) {
      toast.error("Erro ao registrar: " + (err.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("desenvolvimento_log").delete().eq("id", id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["dev_logs"] });
      toast.success("Registro removido");
    }
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const headers = ["Data", "Hora", "Tipo", "Título", "Descrição"];
    const rows = logs.map((l) => [
      format(new Date(l.created_at), "dd/MM/yyyy"),
      format(new Date(l.created_at), "HH:mm"),
      TIPO_CONFIG[l.tipo]?.label || l.tipo,
      l.titulo,
      (l.descricao || "").replace(/[\n\r]/g, " "),
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
          <Button variant="default" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Registrar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
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
              <p className="text-2xl font-bold text-primary">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Total Desenvolvimentos</p>
            </CardContent>
          </Card>
          {Object.entries(summaryByTipo).map(([tipo, count]) => {
            const cfg = TIPO_CONFIG[tipo];
            return (
              <Card key={tipo}>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{cfg?.emoji} {count}</p>
                  <p className="text-xs text-muted-foreground">{cfg?.label || tipo}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Separator />

        {/* Daily breakdown */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum desenvolvimento registrado nesta semana</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Registrar primeiro
            </Button>
          </div>
        ) : (
          byDay.map(({ day, items }) => {
            if (items.length === 0) return null;
            return (
              <div key={day.toISOString()} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm capitalize">
                    {format(day, "EEEE, dd/MM", { locale: ptBR })}
                  </h3>
                  <Badge variant="default" className="text-xs">
                    {items.length} {items.length === 1 ? "item" : "itens"}
                  </Badge>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Hora</TableHead>
                        <TableHead className="w-28">Tipo</TableHead>
                        <TableHead>Desenvolvimento</TableHead>
                        <TableHead className="w-10 print:hidden"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((l) => {
                        const cfg = TIPO_CONFIG[l.tipo] || TIPO_CONFIG.melhoria;
                        const Icon = cfg.icon;
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="text-xs font-mono">
                              {format(new Date(l.created_at), "HH:mm")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                {cfg.label}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{l.titulo}</p>
                              {l.descricao && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{l.descricao}</p>
                              )}
                            </TableCell>
                            <TableCell className="print:hidden">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(l.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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

      {/* Register Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Desenvolvimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.emoji} {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                placeholder="Ex: Criação da tabela desenvolvimento_log"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Detalhes do que foi feito..."
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ℹ️ Será criada automaticamente uma tarefa concluída no Roadmap
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.titulo.trim()}>
              {saving ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
