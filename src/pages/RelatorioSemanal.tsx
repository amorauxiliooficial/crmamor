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
import { ArrowLeft, ChevronLeft, ChevronRight, Printer, Download, Phone, MessageCircle, FileText, StickyNote, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const TIPO_ICONS: Record<string, typeof Phone> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  documento: FileText,
  anotacao: StickyNote,
};

const TIPO_LABELS: Record<string, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  documento: "Documento",
  anotacao: "Anotação",
};

const RESULTADO_LABELS: Record<string, string> = {
  conseguiu_falar: "✅ Conseguiu falar",
  nao_atendeu: "📵 Não atendeu",
  ocupado: "⏳ Ocupada/Indisponível",
  deixou_recado: "💬 Deixou recado",
  avancou: "🚀 Avançou no processo",
  aguardando: "⏸️ Aguardando retorno",
  pendencia: "⚠️ Pendência identificada",
  finalizado: "🏁 Caso finalizado",
};

interface AtividadeRelatorio {
  id: string;
  tipo_atividade: string;
  descricao: string | null;
  data_atividade: string;
  resultado_contato: string | null;
  mae_nome: string;
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

  const { data: atividades = [], isLoading } = useQuery({
    queryKey: ["relatorio_semanal", user?.id, weekStart.toISOString()],
    queryFn: async () => {
      if (!user) return [];

      // Fetch activities with mae names
      const { data, error } = await supabase
        .from("atividades_mae")
        .select("id, tipo_atividade, descricao, data_atividade, resultado_contato, mae_id")
        .eq("user_id", user.id)
        .gte("data_atividade", weekStart.toISOString())
        .lte("data_atividade", weekEnd.toISOString())
        .order("data_atividade", { ascending: true });

      if (error) throw error;

      // Fetch mae names
      const maeIds = [...new Set((data || []).map((a: any) => a.mae_id))];
      const { data: maes } = await supabase
        .from("mae_processo")
        .select("id, nome_mae")
        .in("id", maeIds.length > 0 ? maeIds : ["00000000-0000-0000-0000-000000000000"]);

      const maeMap = new Map((maes || []).map((m: any) => [m.id, m.nome_mae]));

      return (data || []).map((a: any) => ({
        id: a.id,
        tipo_atividade: a.tipo_atividade,
        descricao: a.descricao,
        data_atividade: a.data_atividade,
        resultado_contato: a.resultado_contato,
        mae_nome: maeMap.get(a.mae_id) || "—",
      })) as AtividadeRelatorio[];
    },
    enabled: !!user,
  });

  // Group by day
  const byDay = daysOfWeek.map((day) => ({
    day,
    items: atividades.filter((a) => isSameDay(new Date(a.data_atividade), day)),
  }));

  // Summary by type
  const summaryByType = atividades.reduce<Record<string, number>>((acc, a) => {
    acc[a.tipo_atividade] = (acc[a.tipo_atividade] || 0) + 1;
    return acc;
  }, {});

  // Summary by resultado
  const summaryByResultado = atividades.reduce<Record<string, number>>((acc, a) => {
    if (a.resultado_contato) {
      acc[a.resultado_contato] = (acc[a.resultado_contato] || 0) + 1;
    }
    return acc;
  }, {});

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ["Data", "Horário", "Tipo", "Mãe", "Resultado", "Descrição"];
    const rows = atividades.map((a) => [
      format(new Date(a.data_atividade), "dd/MM/yyyy"),
      format(new Date(a.data_atividade), "HH:mm"),
      TIPO_LABELS[a.tipo_atividade] || a.tipo_atividade,
      a.mae_nome,
      a.resultado_contato ? (RESULTADO_LABELS[a.resultado_contato] || a.resultado_contato) : "",
      (a.descricao || "").replace(/[\n\r]/g, " "),
    ]);

    const csvContent = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-semanal-${format(weekStart, "dd-MM-yyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - hidden on print */}
      <div className="print:hidden border-b bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Relatório Semanal</h1>
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
        {/* Week selector - hidden on print */}
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
          <h1 className="text-xl font-bold">Relatório de Atividades Semanal</h1>
          <p className="text-sm text-muted-foreground">
            Período: {format(weekStart, "dd/MM/yyyy")} a {format(weekEnd, "dd/MM/yyyy")}
          </p>
          <p className="text-sm text-muted-foreground">
            Atendente: {user?.email}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{atividades.length}</p>
              <p className="text-xs text-muted-foreground">Total Atividades</p>
            </CardContent>
          </Card>
          {Object.entries(summaryByType).map(([tipo, count]) => {
            const Icon = TIPO_ICONS[tipo] || StickyNote;
            return (
              <Card key={tipo}>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{TIPO_LABELS[tipo] || tipo}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Resultado summary */}
        {Object.keys(summaryByResultado).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resultados dos Contatos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {Object.entries(summaryByResultado).map(([resultado, count]) => (
                <Badge key={resultado} variant="secondary" className="text-xs">
                  {RESULTADO_LABELS[resultado] || resultado}: {count}
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
                  {items.length} {items.length === 1 ? "atividade" : "atividades"}
                </Badge>
              </div>

              {items.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Hora</TableHead>
                        <TableHead className="w-24">Tipo</TableHead>
                        <TableHead>Mãe</TableHead>
                        <TableHead className="hidden md:table-cell">Resultado</TableHead>
                        <TableHead className="hidden md:table-cell">Descrição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((a) => {
                        const Icon = TIPO_ICONS[a.tipo_atividade] || StickyNote;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="text-xs font-mono">
                              {format(new Date(a.data_atividade), "HH:mm")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                {TIPO_LABELS[a.tipo_atividade] || a.tipo_atividade}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-medium">{a.mae_nome}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs">
                              {a.resultado_contato ? (RESULTADO_LABELS[a.resultado_contato] || a.resultado_contato) : "—"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                              {a.descricao || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic pl-2">Nenhuma atividade registrada</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Print styles */}
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
