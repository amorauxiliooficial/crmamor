import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { RecebimentoItem } from "@/hooks/useExecutiveForecast";

interface Props {
  ultimas: RecebimentoItem[];
  proximos: RecebimentoItem[];
  formatBRL: (n: number) => string;
}

const fmtDate = (iso: string) => {
  try {
    return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso;
  }
};

export function RecebimentosPanels({ ultimas, proximos, formatBRL }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardContent className="p-4 md:p-6 space-y-3">
          <div>
            <h2 className="text-base md:text-lg font-bold tracking-tight">Últimas Entradas</h2>
            <p className="text-xs text-muted-foreground">Receitas confirmadas mais recentes</p>
          </div>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="text-xs text-center">Parc.</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-right hidden md:table-cell">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                      Sem entradas registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  ultimas.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs py-2 truncate max-w-[160px]">{r.nome}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                        {r.tipo}
                      </TableCell>
                      <TableCell className="text-xs text-center tabular-nums">{r.parcela}</TableCell>
                      <TableCell className="text-xs text-right font-semibold tabular-nums text-emerald-500">
                        {formatBRL(r.valor)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground hidden md:table-cell tabular-nums">
                        {fmtDate(r.data)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-4 md:p-6 space-y-3">
          <div>
            <h2 className="text-base md:text-lg font-bold tracking-tight">Próximos Recebimentos</h2>
            <p className="text-xs text-muted-foreground">Parcelas pendentes a vencer</p>
          </div>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs text-center hidden sm:table-cell">Parc.</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proximos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                      Sem parcelas previstas.
                    </TableCell>
                  </TableRow>
                ) : (
                  proximos.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs tabular-nums py-2">{fmtDate(r.data)}</TableCell>
                      <TableCell className="text-xs truncate max-w-[160px]">{r.nome}</TableCell>
                      <TableCell className="text-xs text-center tabular-nums hidden sm:table-cell">
                        {r.parcela}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold tabular-nums">
                        {formatBRL(r.valor)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                        {r.tipo}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
