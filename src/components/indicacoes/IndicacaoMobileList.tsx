import { Indicacao, statusAbordagemLabels, statusAbordagemColors, origemIndicacaoLabels, origemIndicacaoColors, OrigemIndicacao, motivoAbordagemLabels } from "@/types/indicacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Phone, Copy, Check, ExternalLink, Eye, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatBrazilPhone } from "@/lib/formatBrazilPhone";
import { formatTimeSince, getLeadHeat, leadHeatClasses, leadHeatLabels } from "@/lib/leadTimeUtils";

interface IndicacaoMobileListProps {
  indicacoes: Indicacao[];
  selectedId?: string | null;
  onSelect: (indicacao: Indicacao) => void;
}

export function IndicacaoMobileList({ indicacoes, selectedId, onSelect }: IndicacaoMobileListProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const sanitizePhone = (phone: string | undefined | null): string => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const handleCopyPhone = async (e: React.MouseEvent, phone: string, id: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(phone);
    setCopiedId(id);
    toast({ title: "Copiado!", description: "Telefone copiado." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (indicacoes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhuma indicação encontrada
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {indicacoes.map((ind) => {
        const origem = (ind.origem_indicacao || "interna") as OrigemIndicacao;
        const phone = sanitizePhone(ind.telefone_indicada);
        const formattedPhone = formatBrazilPhone(ind.telefone_indicada);
        const isSelected = selectedId === ind.id;

        return (
          <Card
            key={ind.id}
            className={`cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : ""}`}
            onClick={() => onSelect(ind)}
          >
            <CardContent className="p-3 space-y-2">
              {/* Row 1: Name + Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{ind.nome_indicada}</p>
                  {ind.nome_indicadora && (
                    <p className="text-xs text-muted-foreground truncate">
                      por {ind.nome_indicadora}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="secondary" className={`text-xs ${statusAbordagemColors[ind.status_abordagem]}`}>
                    {statusAbordagemLabels[ind.status_abordagem]}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${origemIndicacaoColors[origem]}`}>
                    {origem === "externa" && <ExternalLink className="h-2.5 w-2.5 mr-0.5" />}
                    {origemIndicacaoLabels[origem]}
                  </Badge>
                </div>
              </div>

              {/* Row 2: Date + Tempo com responsável + Motivo */}
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{format(parseISO(ind.data_indicacao), "dd/MM/yy", { locale: ptBR })}</span>
                {(() => {
                  const heat = ind.assigned_user_id ? getLeadHeat(ind.assigned_at) : null;
                  const t = ind.assigned_user_id ? formatTimeSince(ind.assigned_at) : null;
                  if (!heat || !t) return null;
                  return (
                    <Badge variant="outline" className={`h-5 px-1.5 text-xs gap-1 border ${leadHeatClasses[heat]}`}>
                      <Clock className="h-2.5 w-2.5" />
                      {t} · {leadHeatLabels[heat]}
                    </Badge>
                  );
                })()}
                {ind.motivo_abordagem && (
                  <span className="text-xs">{motivoAbordagemLabels[ind.motivo_abordagem as keyof typeof motivoAbordagemLabels]}</span>
                )}
              </div>

              {/* Row 3: Phone + Quick actions */}
              {formattedPhone && (
                <div className="text-xs text-muted-foreground font-mono">
                  {formattedPhone.display}
                </div>
              )}
              <div className="flex items-center gap-1 pt-1 border-t">
                {phone && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/${formattedPhone?.dial || phone}`, "_blank");
                          }}
                          aria-label="Abrir WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="hidden xs:inline">WhatsApp</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>WhatsApp</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:+${phone}`, "_self");
                          }}
                          aria-label="Ligar"
                        >
                          <Phone className="h-3.5 w-3.5 text-blue-600" />
                          <span className="hidden xs:inline">Ligar</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ligar</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleCopyPhone(e, formattedPhone?.dial || ind.telefone_indicada!, ind.id)}
                          aria-label="Copiar telefone"
                        >
                          {copiedId === ind.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <div className="flex-1" />

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(ind);
                  }}
                  aria-label="Ver detalhes"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
