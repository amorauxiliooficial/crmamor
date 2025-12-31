import { MaeProcesso } from "@/types/mae";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaeTableProps {
  maes: MaeProcesso[];
  onRowClick: (mae: MaeProcesso) => void;
}

const formatCpf = (cpf: string) => {
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const getStatusBadgeVariant = (status: string) => {
  if (status.includes("Aprovada")) return "default";
  if (status.includes("Indeferida")) return "destructive";
  if (status.includes("Pendência")) return "secondary";
  if (status.includes("Análise")) return "outline";
  return "outline";
};

export function MaeTable({ maes, onRowClick }: MaeTableProps) {
  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Nome</TableHead>
            <TableHead className="min-w-[130px]">CPF</TableHead>
            <TableHead className="min-w-[120px]">Telefone</TableHead>
            <TableHead className="min-w-[100px]">Tipo Evento</TableHead>
            <TableHead className="min-w-[100px]">Data Evento</TableHead>
            <TableHead className="min-w-[120px]">Categoria</TableHead>
            <TableHead className="min-w-[200px]">Status</TableHead>
            <TableHead className="min-w-[80px]">UF</TableHead>
            <TableHead className="min-w-[100px]">Contrato</TableHead>
            <TableHead className="min-w-[150px]">Última Atualização</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {maes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                Nenhum processo encontrado
              </TableCell>
            </TableRow>
          ) : (
            maes.map((mae) => (
              <TableRow
                key={mae.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(mae)}
              >
                <TableCell className="font-medium">{mae.nome_mae}</TableCell>
                <TableCell>{formatCpf(mae.cpf)}</TableCell>
                <TableCell>{mae.telefone || "-"}</TableCell>
                <TableCell>{mae.tipo_evento}</TableCell>
                <TableCell>
                  {mae.data_evento
                    ? format(new Date(mae.data_evento), "dd/MM/yyyy")
                    : "-"}
                </TableCell>
                <TableCell>{mae.categoria_previdenciaria}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(mae.status_processo)}>
                    {mae.status_processo}
                  </Badge>
                </TableCell>
                <TableCell>{mae.uf || "-"}</TableCell>
                <TableCell>
                  <Badge variant={mae.contrato_assinado ? "default" : "secondary"}>
                    {mae.contrato_assinado ? "Sim" : "Não"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(mae.data_ultima_atualizacao), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
