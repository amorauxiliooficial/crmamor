import { MaeProcesso } from "@/types/mae";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMemo } from "react";
import { differenceInMonths, parseISO } from "date-fns";
import { Baby } from "lucide-react";

interface GestantesBoardProps {
  maes: MaeProcesso[];
  onCardClick: (mae: MaeProcesso) => void;
}

// Calculate pregnancy month based on DPP (expected delivery date)
// Pregnancy lasts ~9 months, so we calculate backwards from DPP
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

export function GestantesBoard({ maes, onCardClick }: GestantesBoardProps) {
  // Filter only gestantes (DPP type and future dates)
  const gestantesPorMes = useMemo(() => {
    const grupos: Record<number, MaeProcesso[]> = {};
    
    // Initialize months 1-9
    for (let i = 1; i <= 9; i++) {
      grupos[i] = [];
    }
    
    maes.forEach((mae) => {
      const mes = calcularMesGravidez(mae.data_evento, mae.data_evento_tipo);
      if (mes !== null) {
        grupos[mes].push(mae);
      }
    });
    
    return grupos;
  }, [maes]);

  const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const getMesLabel = (mes: number) => {
    const labels: Record<number, string> = {
      1: "1º Mês",
      2: "2º Mês",
      3: "3º Mês",
      4: "4º Mês",
      5: "5º Mês",
      6: "6º Mês",
      7: "7º Mês",
      8: "8º Mês",
      9: "9º Mês",
    };
    return labels[mes];
  };

  const getMesColor = (mes: number) => {
    // Colors get more intense as pregnancy progresses
    const colors: Record<number, string> = {
      1: "bg-pink-100 dark:bg-pink-900/30",
      2: "bg-pink-100 dark:bg-pink-900/30",
      3: "bg-pink-200 dark:bg-pink-800/40",
      4: "bg-pink-200 dark:bg-pink-800/40",
      5: "bg-pink-300 dark:bg-pink-700/50",
      6: "bg-pink-300 dark:bg-pink-700/50",
      7: "bg-rose-400/50 dark:bg-rose-600/50",
      8: "bg-rose-400/50 dark:bg-rose-600/50",
      9: "bg-rose-500/50 dark:bg-rose-500/50",
    };
    return colors[mes];
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 p-4">
        {meses.map((mes) => (
          <div
            key={mes}
            className="flex h-full w-[280px] flex-shrink-0 flex-col rounded-lg border bg-card"
          >
            <div
              className={cn(
                "flex items-center gap-2 border-b px-4 py-3",
                getMesColor(mes)
              )}
            >
              <Baby className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              <h3 className="font-semibold text-sm">{getMesLabel(mes)}</h3>
              <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-medium">
                {gestantesPorMes[mes].length}
              </span>
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2 min-h-[100px]">
                {gestantesPorMes[mes].map((mae) => (
                  <KanbanCard
                    key={mae.id}
                    mae={mae}
                    onClick={() => onCardClick(mae)}
                  />
                ))}
                {gestantesPorMes[mes].length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma gestante
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
