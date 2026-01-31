import { MaeProcesso, STATUS_COLORS } from "@/types/mae";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCpf, formatPhone } from "@/lib/formatters";
import { 
  Phone, 
  Plus, 
  History, 
  CalendarPlus,
  MoreHorizontal,
  MessageCircle,
  User
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClienteCardProps {
  mae: MaeProcesso;
  pendingCount?: number;
  lastActivityDate?: string | null;
  onClick?: (mae: MaeProcesso) => void;
  onNovaAtividade: (mae: MaeProcesso) => void;
  onVerHistorico: (mae: MaeProcesso) => void;
  onAgendarFollowUp: (mae: MaeProcesso) => void;
}

export function ClienteCard({ 
  mae, 
  pendingCount = 0,
  lastActivityDate,
  onClick,
  onNovaAtividade, 
  onVerHistorico, 
  onAgendarFollowUp 
}: ClienteCardProps) {
  const statusBg = STATUS_COLORS[mae.status_processo] || "bg-muted";
  
  const handleCardClick = () => {
    if (onClick) {
      onClick(mae);
    }
  };
  
  return (
    <Card 
      className={`transition-all hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Name and Status */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <h4 className="font-medium text-sm truncate">{mae.nome_mae}</h4>
                <p className="text-xs text-muted-foreground font-mono">{formatCpf(mae.cpf)}</p>
              </div>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="shrink-0 text-[10px]">
                  {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            
            {/* Status Badge */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className={`text-[10px] ${statusBg}`}>
                {mae.status_processo}
              </Badge>
              {lastActivityDate && (
                <span className="text-[10px] text-muted-foreground">
                  Última: {format(new Date(lastActivityDate), "dd/MM", { locale: ptBR })}
                </span>
              )}
            </div>
            
            {/* Contact Info */}
            {mae.telefone && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{formatPhone(mae.telefone)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNovaAtividade(mae);
              }}
              className="h-8 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Atividade</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onNovaAtividade(mae)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Atividade
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onVerHistorico(mae)}>
                  <History className="h-4 w-4 mr-2" />
                  Ver Histórico
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAgendarFollowUp(mae)}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Agendar Follow-up
                </DropdownMenuItem>
                {mae.telefone && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => window.open(`https://wa.me/55${mae.telefone?.replace(/\D/g, '')}`, '_blank')}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Abrir WhatsApp
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
