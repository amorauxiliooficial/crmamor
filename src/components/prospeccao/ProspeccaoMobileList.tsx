import { Prospeccao, statusProspeccaoLabels, statusProspeccaoColors } from "@/types/prospeccao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Phone, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProspeccaoMobileListProps {
  items: Prospeccao[];
  selectedId?: string | null;
  onSelect: (p: Prospeccao) => void;
}

export function ProspeccaoMobileList({ items, selectedId, onSelect }: ProspeccaoMobileListProps) {
  const sanitizePhone = (phone: string | undefined | null): string => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  if (items.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma prospecção encontrada</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((p) => {
        const phone = sanitizePhone(p.telefone_e164 || p.telefone);
        return (
          <Card key={p.id} className={`cursor-pointer transition-colors ${selectedId === p.id ? "ring-2 ring-primary" : ""}`} onClick={() => onSelect(p)}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{p.nome}</p>
                  {p.mes_gestacao && <p className="text-xs text-muted-foreground">{p.mes_gestacao}º mês</p>}
                  {p.observacoes && <p className="text-[11px] text-muted-foreground italic line-clamp-1">{p.observacoes}</p>}
                </div>
                <Badge variant="secondary" className={`text-[10px] ${statusProspeccaoColors[p.status]}`}>
                  {statusProspeccaoLabels[p.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{format(parseISO(p.created_at), "dd/MM/yy", { locale: ptBR })}</span>
                <span>{p.origem || "chatbot"}</span>
              </div>
              <div className="flex items-center gap-1 pt-1 border-t">
                {phone && (
                  <>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${phone}`, "_blank"); }}>
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); window.open(`tel:+${phone}`, "_self"); }}>
                      <Phone className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                  </>
                )}
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); onSelect(p); }}>
                  <Eye className="h-3.5 w-3.5" /> Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
