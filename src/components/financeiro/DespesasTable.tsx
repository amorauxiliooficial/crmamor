import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2, Plus, Receipt, CheckCircle2, Clock, AlertTriangle, XCircle, Filter } from "lucide-react";
import { format, parseISO, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDespesas } from "@/hooks/useDespesas";
import { DespesaFormDialog } from "./DespesaFormDialog";
import type { Despesa, StatusTransacao } from "@/types/despesa";
import { CATEGORIA_LABELS, RECORRENCIA_LABELS } from "@/types/despesa";
import type { FilterPeriod } from "./FinanceiroFilters";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface DespesasTableProps {
  period?: FilterPeriod;
  selectedMonth?: number;
  selectedYear?: number;
}

type StatusFilter = "todos" | "pago" | "pendente" | "atrasado";

export function DespesasTable({ period = "mes", selectedMonth, selectedYear }: DespesasTableProps) {
  const { despesas, deleteDespesa, isLoading } = useDespesas();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [despesaToDelete, setDespesaToDelete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  // Filtrar despesas pelo período selecionado (usando data_vencimento)
  const filteredDespesas = useMemo(() => {
    let filtered = despesas;

    // Filtro por período usando data_vencimento
    if (period !== "total") {
      const now = new Date();
      const filterMonth = selectedMonth ?? getMonth(now);
      const filterYear = selectedYear ?? getYear(now);

      filtered = filtered.filter((d) => {
        try {
          const vencDate = parseISO(d.data_vencimento);
          const despesaMonth = getMonth(vencDate);
          const despesaYear = getYear(vencDate);

          if (period === "ano") {
            return despesaYear === filterYear;
          }
          return despesaYear === filterYear && despesaMonth === filterMonth;
        } catch {
          return false;
        }
      });
    }

    // Filtro por status
    if (statusFilter !== "todos") {
      filtered = filtered.filter((d) => {
        if (statusFilter === "pendente") {
          return d.status === "pendente" || d.status === "atrasado";
        }
        return d.status === statusFilter;
      });
    }

    return filtered;
  }, [despesas, period, selectedMonth, selectedYear, statusFilter]);

  // Resumo do período filtrado
  const resumo = useMemo(() => {
    const totalPago = filteredDespesas.filter(d => d.status === "pago").reduce((s, d) => s + d.valor, 0);
    const totalPendente = filteredDespesas.filter(d => d.status === "pendente" || d.status === "atrasado").reduce((s, d) => s + d.valor, 0);
    return { totalPago, totalPendente, total: totalPago + totalPendente };
  }, [filteredDespesas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: StatusTransacao) => {
    switch (status) {
      case "pago":
        return (
          <Badge className="bg-primary/20 text-primary">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Pago
          </Badge>
        );
      case "pendente":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "atrasado":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Atrasado
          </Badge>
        );
      case "cancelado":
        return (
          <Badge variant="outline">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelado
          </Badge>
        );
    }
  };

  const handleEdit = (despesa: Despesa) => {
    setEditingDespesa(despesa);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!despesaToDelete) return;
    await deleteDespesa.mutateAsync(despesaToDelete);
    setDeleteDialogOpen(false);
    setDespesaToDelete(null);
  };

  const handleNew = () => {
    setEditingDespesa(null);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Receipt className="h-4 w-4 text-destructive" />
              Despesas
            </CardTitle>
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Despesa
            </Button>
          </div>

          {/* Status filter + resumo */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ToggleGroup
              type="single"
              value={statusFilter}
              onValueChange={(v) => v && setStatusFilter(v as StatusFilter)}
              className="justify-start"
            >
              <ToggleGroupItem value="todos" size="sm" className="text-xs h-7 px-2.5">
                Todos
              </ToggleGroupItem>
              <ToggleGroupItem value="pago" size="sm" className="text-xs h-7 px-2.5">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Pagos
              </ToggleGroupItem>
              <ToggleGroupItem value="pendente" size="sm" className="text-xs h-7 px-2.5">
                <Clock className="h-3 w-3 mr-1" />
                Pendentes
              </ToggleGroupItem>
            </ToggleGroup>
            
            <div className="flex gap-3 text-xs">
              <span className="text-primary font-semibold">
                Pago: {formatCurrency(resumo.totalPago)}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-destructive font-semibold">
                Pendente: {formatCurrency(resumo.totalPendente)}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="font-semibold">
                Total: {formatCurrency(resumo.total)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recorrência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredDespesas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma despesa neste período
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDespesas.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.descricao}</TableCell>
                      <TableCell>{CATEGORIA_LABELS[d.categoria]}</TableCell>
                      <TableCell>{d.fornecedor || "-"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(d.valor)}
                      </TableCell>
                      <TableCell>{formatDate(d.data_vencimento)}</TableCell>
                      <TableCell>{getStatusBadge(d.status)}</TableCell>
                      <TableCell>{RECORRENCIA_LABELS[d.recorrencia]}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(d)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDespesaToDelete(d.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y">
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : filteredDespesas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma despesa neste período
              </div>
            ) : (
              filteredDespesas.map((d) => (
                <div key={d.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{d.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORIA_LABELS[d.categoria]} • {d.fornecedor || "Sem fornecedor"}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-sm">
                      {formatCurrency(d.valor)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Venc: {formatDate(d.data_vencimento)}
                    </span>
                    {getStatusBadge(d.status)}
                  </div>
                  <div className="flex justify-end gap-1 pt-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(d)}>
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDespesaToDelete(d.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <DespesaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        despesa={editingDespesa}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
