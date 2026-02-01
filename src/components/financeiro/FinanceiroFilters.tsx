import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Filter } from "lucide-react";
import { format, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export type FilterPeriod = "mes" | "ano" | "total";

interface FinanceiroFiltersProps {
  period: FilterPeriod;
  onPeriodChange: (period: FilterPeriod) => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

const months = [
  { value: 0, label: "Janeiro" },
  { value: 1, label: "Fevereiro" },
  { value: 2, label: "Março" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Maio" },
  { value: 5, label: "Junho" },
  { value: 6, label: "Julho" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" },
  { value: 10, label: "Novembro" },
  { value: 11, label: "Dezembro" },
];

export function FinanceiroFilters({
  period,
  onPeriodChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
}: FinanceiroFiltersProps) {
  const currentYear = getYear(new Date());
  const years = useMemo(() => {
    const result = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      result.push(y);
    }
    return result;
  }, [currentYear]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-xs font-medium hidden sm:inline">Filtrar:</span>
      </div>
      
      {/* Period Type Selector */}
      <div className="flex bg-muted rounded-lg p-0.5">
        <Button
          variant={period === "mes" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs px-2.5"
          onClick={() => onPeriodChange("mes")}
        >
          Mês
        </Button>
        <Button
          variant={period === "ano" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs px-2.5"
          onClick={() => onPeriodChange("ano")}
        >
          Ano
        </Button>
        <Button
          variant={period === "total" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs px-2.5"
          onClick={() => onPeriodChange("total")}
        >
          Total
        </Button>
      </div>

      {/* Month Selector (only visible when period is "mes") */}
      {period === "mes" && (
        <Select
          value={selectedMonth.toString()}
          onValueChange={(v) => onMonthChange(parseInt(v))}
        >
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value.toString()}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Year Selector (visible for mes and ano) */}
      {period !== "total" && (
        <Select
          value={selectedYear.toString()}
          onValueChange={(v) => onYearChange(parseInt(v))}
        >
          <SelectTrigger className="w-[80px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
