import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { useCriativos, useDeleteCriativo } from "@/hooks/useMarketing";
import { Criativo } from "@/types/marketing";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MarketingCalendarProps {
  onAddCriativo: (date: Date) => void;
  onEditCriativo: (criativo: Criativo) => void;
}

const diasSemana = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

export function MarketingCalendar({ onAddCriativo, onEditCriativo }: MarketingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [criativoToDelete, setCriativoToDelete] = useState<Criativo | null>(null);
  
  const isMobile = useIsMobile();
  const { data: criativos = [] } = useCriativos(currentMonth);
  const deleteCriativo = useDeleteCriativo();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week the month starts on (0-6)
  const startDayOfWeek = getDay(monthStart);
  
  // Create empty cells for days before the month starts
  const emptyDays = Array(startDayOfWeek).fill(null);

  const getCriativosForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return criativos.filter((c) => c.data_postagem === dateStr);
  };

  const getTipoInstagramColor = (tipo: string) => {
    switch (tipo) {
      case "feed":
        return "bg-primary/20 text-primary border-primary/50";
      case "stories":
        return "bg-chart-2/20 text-chart-2 border-chart-2/50";
      case "reels":
        return "bg-chart-4/20 text-chart-4 border-chart-4/50";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, criativo: Criativo) => {
    e.stopPropagation();
    setCriativoToDelete(criativo);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (criativoToDelete) {
      await deleteCriativo.mutateAsync(criativoToDelete.id);
      setCriativoToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header com navegação do mês */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl md:text-2xl font-bold">Calendário</h2>
          <span className="text-xl md:text-2xl font-light text-muted-foreground">
            {format(currentMonth, "yyyy", { locale: ptBR })}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-lg font-semibold mb-4 capitalize">
        {format(currentMonth, "MMMM", { locale: ptBR })}
      </div>

      {/* Grid do calendário */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden min-w-[700px]">
          {/* Cabeçalho dos dias da semana */}
          {diasSemana.map((dia) => (
            <div
              key={dia}
              className="bg-muted/50 p-2 text-center text-xs font-semibold text-muted-foreground"
            >
              {dia}
            </div>
          ))}

          {/* Células vazias antes do início do mês */}
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="bg-card min-h-[100px] md:min-h-[120px]" />
          ))}

          {/* Dias do mês */}
          {days.map((day) => {
            const dayCriativos = getCriativosForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "bg-card min-h-[100px] md:min-h-[120px] p-1 md:p-2 relative group",
                  isToday && "ring-2 ring-primary ring-inset"
                )}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onAddCriativo(day)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <ScrollArea className="h-[60px] md:h-[80px] mt-1">
                  <div className="space-y-1">
                    {dayCriativos.map((criativo) => (
                      <Tooltip key={criativo.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "text-[10px] md:text-xs p-1 rounded border cursor-pointer truncate group/item relative",
                              getTipoInstagramColor(criativo.tipo_instagram),
                              criativo.status === "postado" && "opacity-60",
                              criativo.status === "cancelado" && "line-through opacity-40"
                            )}
                            onClick={() => onEditCriativo(criativo)}
                            style={{
                              borderLeftWidth: 3,
                              borderLeftColor: criativo.tipo_conteudo?.cor || "hsl(var(--primary))",
                            }}
                          >
                            <span className="pr-4">{criativo.titulo}</span>
                            <button
                              className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 hover:text-destructive"
                              onClick={(e) => handleDeleteClick(e, criativo)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px]">
                          <div className="space-y-1">
                            <p className="font-semibold">{criativo.titulo}</p>
                            {criativo.tipo_conteudo && (
                              <Badge
                                variant="outline"
                                className="text-[10px]"
                                style={{
                                  borderColor: criativo.tipo_conteudo.cor,
                                  color: criativo.tipo_conteudo.cor,
                                }}
                              >
                                {criativo.tipo_conteudo.nome}
                              </Badge>
                            )}
                            {criativo.horario_postagem && (
                              <p className="text-xs text-muted-foreground">
                                {criativo.horario_postagem}
                              </p>
                            )}
                            {criativo.descricao && (
                              <p className="text-xs">{criativo.descricao}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover criativo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{criativoToDelete?.titulo}" do calendário?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
