import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import type { PagamentoComMae } from "@/hooks/usePagamentos";
import type { FilterPeriod } from "./FinanceiroFilters";
import { parseISO, getMonth, getYear, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

interface ReceitasMaesTableProps {
  pagamentos: PagamentoComMae[];
  period: FilterPeriod;
  selectedMonth: number;
  selectedYear: number;
}

interface MaeReceita {
  mae_id: string;
  mae_nome: string;
  mae_cpf: string;
  valor_pago: number;
  valor_pendente: number;
  total_parcelas: number;
  parcelas_pagas: number;
}

export function ReceitasMaesTable({
  pagamentos,
  period,
  selectedMonth,
  selectedYear,
}: ReceitasMaesTableProps) {
  const [search, setSearch] = useState("");

  const receitasPorMae = useMemo(() => {
    const maeMap = new Map<string, MaeReceita>();

    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        // Apply period filter
        if (period !== "total" && p.data_pagamento) {
          try {
            const parcelaDate = parseISO(p.data_pagamento);
            const parcelaYear = getYear(parcelaDate);
            const parcelaMonth = getMonth(parcelaDate);

            if (period === "ano" && parcelaYear !== selectedYear) return;
            if (period === "mes" && (parcelaYear !== selectedYear || parcelaMonth !== selectedMonth)) return;
          } catch {
            return;
          }
        } else if (period !== "total" && !p.data_pagamento) {
          return; // Skip parcelas without date when filtering
        }

        const key = pag.mae_id;
        const existing = maeMap.get(key) || {
          mae_id: pag.mae_id,
          mae_nome: pag.mae_nome,
          mae_cpf: pag.mae_cpf,
          valor_pago: 0,
          valor_pendente: 0,
          total_parcelas: 0,
          parcelas_pagas: 0,
        };

        const valor = p.valor || 0;
        if (p.status === "pago") {
          existing.valor_pago += valor;
          existing.parcelas_pagas += 1;
        } else {
          existing.valor_pendente += valor;
        }
        existing.total_parcelas += 1;

        maeMap.set(key, existing);
      });
    });

    return Array.from(maeMap.values())
      .filter((m) => m.valor_pago > 0 || m.valor_pendente > 0)
      .sort((a, b) => (b.valor_pago + b.valor_pendente) - (a.valor_pago + a.valor_pendente));
  }, [pagamentos, period, selectedMonth, selectedYear]);

  const filteredReceitas = useMemo(() => {
    if (!search) return receitasPorMae;
    const term = search.toLowerCase();
    return receitasPorMae.filter(
      (m) => m.mae_nome.toLowerCase().includes(term) || m.mae_cpf.includes(term)
    );
  }, [receitasPorMae, search]);

  const totals = useMemo(() => {
    return receitasPorMae.reduce(
      (acc, m) => ({
        pago: acc.pago + m.valor_pago,
        pendente: acc.pendente + m.valor_pendente,
      }),
      { pago: 0, pendente: 0 }
    );
  }, [receitasPorMae]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCpf = (cpf: string) => {
    if (cpf.length !== 11) return cpf;
    return `***.***.${cpf.slice(6, 9)}-**`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-base md:text-lg">Receitas das Mães</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {receitasPorMae.length} mães
            </Badge>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar mãe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground">Recebido</p>
              <p className="text-sm font-bold text-primary">{formatCurrency(totals.pago)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10">
            <Clock className="h-4 w-4 text-warning" />
            <div>
              <p className="text-[10px] text-muted-foreground">Pendente</p>
              <p className="text-sm font-bold text-warning">{formatCurrency(totals.pendente)}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[300px] md:h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Mãe</TableHead>
                <TableHead className="text-xs text-right">Recebido</TableHead>
                <TableHead className="text-xs text-right hidden sm:table-cell">Pendente</TableHead>
                <TableHead className="text-xs text-center hidden sm:table-cell">Parcelas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceitas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhuma receita encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceitas.map((mae) => (
                  <TableRow key={mae.mae_id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[150px] sm:max-w-none">
                          {mae.mae_nome}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatCpf(mae.mae_cpf)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-semibold text-primary">
                        {formatCurrency(mae.valor_pago)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(mae.valor_pendente)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <Badge variant="outline" className="text-[10px]">
                        {mae.parcelas_pagas}/{mae.total_parcelas}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
