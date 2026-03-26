import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutGrid, List, Baby, ClipboardCheck, DollarSign, UserPlus, MessageSquare, Target } from "lucide-react";

interface MobileViewSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const viewOptions = [
  { id: "kanban", label: "Processos", icon: LayoutGrid },
  { id: "table", label: "Tabela", icon: List },
  { id: "gestantes", label: "Gestantes", icon: Baby },
  { id: "conferencia", label: "Conferência", icon: ClipboardCheck },
  { id: "pagamentos", label: "Pagamentos", icon: DollarSign },
  { id: "indicacoes", label: "Indicações", icon: UserPlus },
  { id: "prospeccao", label: "Prospecção", icon: Target },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

export function MobileViewSelector({ value, onValueChange }: MobileViewSelectorProps) {
  const currentView = viewOptions.find((v) => v.id === value);
  const CurrentIcon = currentView?.icon || LayoutGrid;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full md:hidden">
        <div className="flex items-center gap-2">
          <CurrentIcon className="h-4 w-4" />
          <SelectValue placeholder="Selecione a visualização" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {viewOptions.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <div className="flex items-center gap-2">
              <option.icon className="h-4 w-4" />
              {option.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
