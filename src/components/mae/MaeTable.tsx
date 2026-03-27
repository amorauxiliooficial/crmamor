import { useState, useMemo, useEffect } from "react";
import { MaeProcesso, StatusProcesso, STATUS_ORDER } from "@/types/mae";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, differenceInMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Settings2, Check, X, ArrowUpDown, Filter, MoreHorizontal, Copy, Baby, FolderOpen, Flame } from "lucide-react";
import { toast } from "sonner";

interface MaeTableProps {
  maes: MaeProcesso[];
  onRowClick: (mae: MaeProcesso) => void;
}

interface Column {
  id: keyof MaeProcesso | "acoes" | "mes_gravidez" | "documentos";
  label: string;
  visible: boolean;
  sortable: boolean;
}

// Calculate pregnancy month based on DPP (expected delivery date)
function calcularMesGravidez(dataEvento: string | undefined, dataEventoTipo: string | undefined): number | null {
  if (!dataEvento || dataEventoTipo !== "DPP") return null;
  
  const dpp = parseISO(dataEvento);
  const hoje = new Date();
  
  // If DPP already passed, baby was born
  if (dpp < hoje) return null;
  
  // Calculate months until delivery
  const mesesAteParto = differenceInMonths(dpp, hoje);
  
  // Pregnancy is ~9 months, so current month = 9 - months until delivery
  const mesGravidez = Math.max(1, Math.min(9, 9 - mesesAteParto));
  
  return mesGravidez;
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

const defaultColumns: Column[] = [
  { id: "acoes", label: "Ações", visible: true, sortable: false },
  { id: "nome_mae", label: "Nome", visible: true, sortable: true },
  { id: "cpf", label: "CPF", visible: true, sortable: true },
  { id: "documentos", label: "Docs", visible: true, sortable: false },
  { id: "mes_gravidez", label: "Mês Gravidez", visible: true, sortable: true },
  { id: "telefone", label: "Telefone", visible: true, sortable: false },
  { id: "email", label: "Email", visible: false, sortable: true },
  { id: "tipo_evento", label: "Tipo Evento", visible: true, sortable: true },
  { id: "data_evento", label: "Data Evento", visible: true, sortable: true },
  { id: "categoria_previdenciaria", label: "Categoria", visible: true, sortable: true },
  { id: "status_processo", label: "Status", visible: true, sortable: true },
  { id: "uf", label: "UF", visible: true, sortable: true },
  { id: "contrato_assinado", label: "Contrato", visible: true, sortable: true },
  { id: "senha_gov", label: "Senha Gov", visible: true, sortable: false },
  { id: "verificacao_duas_etapas", label: "2FA", visible: true, sortable: true },
  { id: "protocolo_inss", label: "Protocolo INSS", visible: false, sortable: true },
  { id: "parcelas", label: "Parcelas", visible: false, sortable: false },
  { id: "segurada", label: "Segurada", visible: false, sortable: true },
  { id: "precisa_gps", label: "GPS", visible: false, sortable: true },
  { id: "origem", label: "Origem", visible: false, sortable: true },
  { id: "data_ultima_atualizacao", label: "Última Atualização", visible: true, sortable: true },
];

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  } catch (err) {
    toast.error("Erro ao copiar");
  }
};

const COLUMNS_STORAGE_KEY = "mae-table-columns-v3";

const loadColumnsFromStorage = (): Column[] => {
  try {
    const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (stored) {
      const parsedColumns = JSON.parse(stored) as Column[];
      // Merge with default columns to handle new columns added in updates
      return defaultColumns.map(defaultCol => {
        const storedCol = parsedColumns.find(c => c.id === defaultCol.id);
        return storedCol ? { ...defaultCol, visible: storedCol.visible } : defaultCol;
      });
    }
  } catch (e) {
    console.error("Error loading columns from storage:", e);
  }
  return defaultColumns;
};

export function MaeTable({ maes, onRowClick }: MaeTableProps) {
  const [columns, setColumns] = useState<Column[]>(loadColumnsFromStorage);
  const [sortColumn, setSortColumn] = useState<keyof MaeProcesso | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<StatusProcesso | "all">("all");
  const [quenteFilter, setQuenteFilter] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  const visibleColumns = useMemo(() => columns.filter((col) => col.visible), [columns]);

  const filteredMaes = useMemo(() => {
    let result = maes;
    if (statusFilter !== "all") {
      result = result.filter((mae) => mae.status_processo === statusFilter);
    }
    if (quenteFilter) {
      result = result.filter((mae) => (mae as any).ja_trabalhou === true);
    }
    return result;
  }, [maes, statusFilter, quenteFilter]);

  const sortedMaes = useMemo(() => {
    if (!sortColumn) return filteredMaes;
    
    return [...filteredMaes].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === undefined || aVal === null) return sortDirection === "asc" ? 1 : -1;
      if (bVal === undefined || bVal === null) return sortDirection === "asc" ? -1 : 1;
      
      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        return sortDirection === "asc" 
          ? (aVal === bVal ? 0 : aVal ? -1 : 1)
          : (aVal === bVal ? 0 : aVal ? 1 : -1);
      }
      
      const comparison = String(aVal).localeCompare(String(bVal), "pt-BR", { sensitivity: "base" });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredMaes, sortColumn, sortDirection]);

  const handleSort = (columnId: keyof MaeProcesso) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const toggleColumn = (columnId: string) => {
    setColumns(
      columns.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const renderCellContent = (mae: MaeProcesso, columnId: keyof MaeProcesso | "mes_gravidez" | "documentos") => {
    // Handle special documentos column
    if (columnId === "documentos") {
      if (mae.link_documentos) {
        return (
          <span title="Documentos anexados">
            <FolderOpen className="h-4 w-4 text-primary fill-primary/20" />
          </span>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    }

    // Handle special mes_gravidez column
    if (columnId === "mes_gravidez") {
      const mes = calcularMesGravidez(mae.data_evento, mae.data_evento_tipo);
      if (mes === null) return "-";
      return (
        <Badge variant="outline" className="gap-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700">
          <Baby className="h-3 w-3" />
          {mes}º mês
        </Badge>
      );
    }

    const value = mae[columnId as keyof MaeProcesso];

    switch (columnId) {
      case "nome_mae":
        return (
          <div className="flex items-center gap-1.5">
            <span>{value as string}</span>
            {(mae as any).ja_trabalhou && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 gap-0.5">
                <Flame className="h-2.5 w-2.5" />
                Quente
              </Badge>
            )}
          </div>
        );
      case "cpf":
        return formatCpf(value as string);
      case "data_evento":
        return value ? format(new Date(value as string), "dd/MM/yyyy") : "-";
      case "data_ultima_atualizacao":
        return format(new Date(value as string), "dd/MM/yyyy HH:mm", { locale: ptBR });
      case "status_processo":
        return (
          <Badge variant={getStatusBadgeVariant(value as string)} className="whitespace-nowrap">
            {value}
          </Badge>
        );
      case "contrato_assinado":
        return (
          <Badge variant={value ? "default" : "secondary"}>
            {value ? "Sim" : "Não"}
          </Badge>
        );
      case "verificacao_duas_etapas":
        return value ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        );
      case "senha_gov":
        return value ? String(value) : "-";
      default:
        return value !== undefined && value !== null ? String(value) : "-";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusProcesso | "all")}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_ORDER.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              Limpar filtro
            </Button>
          )}
          <Button
            variant={quenteFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setQuenteFilter(!quenteFilter)}
            className="gap-1"
          >
            <Flame className="h-3.5 w-3.5" />
            Quentes
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background">
            <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.visible}
                onCheckedChange={() => toggleColumn(column.id)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead
                  key={column.id}
                  className={`min-w-[100px] ${column.sortable ? "cursor-pointer hover:bg-muted/50" : ""}`}
                  onClick={() => column.sortable && column.id !== "acoes" && handleSort(column.id as keyof MaeProcesso)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && column.id !== "acoes" && (
                      <ArrowUpDown className={`h-3 w-3 ${sortColumn === column.id ? "text-primary" : "text-muted-foreground"}`} />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMaes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="text-center text-muted-foreground py-8">
                  Nenhum processo encontrado
                </TableCell>
              </TableRow>
            ) : (
              sortedMaes.map((mae) => (
                <TableRow
                  key={mae.id}
                  className="hover:bg-muted/50"
                >
                  {visibleColumns.map((column) => (
                    <TableCell key={column.id}>
                      {column.id === "acoes" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-background">
                            <DropdownMenuLabel>Copiar</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => copyToClipboard(mae.cpf, "CPF")}>
                              <Copy className="h-4 w-4 mr-2" />
                              CPF
                            </DropdownMenuItem>
                            {mae.telefone && (
                              <DropdownMenuItem onClick={() => copyToClipboard(mae.telefone!, "Telefone")}>
                                <Copy className="h-4 w-4 mr-2" />
                                Telefone
                              </DropdownMenuItem>
                            )}
                            {mae.email && (
                              <DropdownMenuItem onClick={() => copyToClipboard(mae.email!, "Email")}>
                                <Copy className="h-4 w-4 mr-2" />
                                Email
                              </DropdownMenuItem>
                            )}
                            {mae.senha_gov && (
                              <DropdownMenuItem onClick={() => copyToClipboard(mae.senha_gov!, "Senha Gov")}>
                                <Copy className="h-4 w-4 mr-2" />
                                Senha Gov
                              </DropdownMenuItem>
                            )}
                            {mae.protocolo_inss && (
                              <DropdownMenuItem onClick={() => copyToClipboard(mae.protocolo_inss!, "Protocolo INSS")}>
                                <Copy className="h-4 w-4 mr-2" />
                                Protocolo INSS
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onRowClick(mae)}>
                              Ver detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        renderCellContent(mae, column.id as keyof MaeProcesso | "mes_gravidez" | "documentos")
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-sm text-muted-foreground">
        {sortedMaes.length} registro(s) encontrado(s)
      </div>
    </div>
  );
}
