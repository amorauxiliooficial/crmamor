import { Prospeccao, StatusProspeccao, statusProspeccaoLabels, statusProspeccaoColors } from "@/types/prospeccao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Phone, Eye, Copy, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calcularMesGestacaoProspeccao } from "@/lib/gestacaoUtils";
import { useState } from "react";

interface ProspeccaoMobileListProps {
  items: Prospeccao[];
  selectedId?: string | null;
  onSelect: (p: Prospeccao) => void;
  onStatusChange?: (id: string, status: StatusProspeccao) => void;
  updatingStatusId?: string | null;
}

export function ProspeccaoMobileList({
  items,
  selectedId,
  onSelect,
  onStatusChange,
  updatingStatusId,
}: ProspeccaoMobileListProps) {
  const [copiedNameId, setCopiedNameId] = useState<string | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const sanitizePhone = (phone: string | undefined | null): string => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const handleCopyName = async (e: React.MouseEvent, name: string, id: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(name);
    setCopiedNameId(id);
    setTimeout(() => setCopiedNameId(null), 2000);
  };

  const handleCopyPhone = async (e: React.MouseEvent, phoneRaw: string, id: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(`+55 ${phoneRaw}`);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  if (items.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma prospecção encontrada</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((p) => {
        const phone = sanitizePhone(p.telefone_e164 || p.telefone);
        const mesAtual = calcularMesGestacaoProspeccao(p.mes_gestacao, p.created_at);
        return (
          <Card key={p.id} className={`cursor-pointer transition-colors ${selectedId === p.id ? "ring-2 ring-primary" : ""}`} onClick={() => onSelect(p)}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 group">
                    <p className="font-medium text-sm truncate">{p.nome}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => handleCopyName(e, p.nome, p.id)}
                          >
                            {copiedNameId === p.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar nome</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {mesAtual != null && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-xs text-muted-foreground">{mesAtual}º mês</p>
                      {mesAtual >= 7 && (
                        <Badge variant="secondary" className={`text-[10px] px-1 py-0 h-4 ${mesAtual >= 8 ? "bg-pink-200 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                          {mesAtual >= 8 ? "Urgente" : "Próxima"}
                        </Badge>
                      )}
                    </div>
                  )}
                  {p.observacoes && <p className="text-[11px] text-muted-foreground italic line-clamp-1 mt-0.5">{p.observacoes}</p>}
                </div>
                {onStatusChange ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={p.status}
                      onValueChange={(v) => onStatusChange(p.id, v as StatusProspeccao)}
                      disabled={updatingStatusId === p.id}
                    >
                      <SelectTrigger className={`h-7 text-[11px] px-2 py-0 border-0 ${statusProspeccaoColors[p.status]}`}>
                        <SelectValue>{statusProspeccaoLabels[p.status]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusProspeccaoLabels).map(([v, l]) => (
                          <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Badge variant="secondary" className={`text-[10px] ${statusProspeccaoColors[p.status]}`}>
                    {statusProspeccaoLabels[p.status]}
                  </Badge>
                )}
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); window.open(`tel:+55${phone}`, "_self"); }}>
                            <Phone className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>+55 {p.telefone}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => handleCopyPhone(e, p.telefone, p.id)}
                          >
                            {copiedPhoneId === p.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar telefone</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
