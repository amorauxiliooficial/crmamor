import { Indicacao, statusAbordagemLabels, statusAbordagemColors, origemIndicacaoLabels, origemIndicacaoColors, OrigemIndicacao, motivoAbordagemLabels } from "@/types/indicacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Phone, Copy, Check, ExternalLink, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface IndicacaoMobileListProps {
  indicacoes: Indicacao[];
  selectedId?: string | null;
  onSelect: (indicacao: Indicacao) => void;
}

export function IndicacaoMobileList({ indicacoes, selectedId, onSelect }: IndicacaoMobileListProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
                  <Badge variant="secondary" className={`text-[10px] ${statusAbordagemColors[ind.status_abordagem]}`}>
                    {statusAbordagemLabels[ind.status_abordagem]}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${origemIndicacaoColors[origem]}`}>
                    {origem === "externa" && <ExternalLink className="h-2.5 w-2.5 mr-0.5" />}
                    {origemIndicacaoLabels[origem]}
                  </Badge>
                </div>
              </div>

              {/* Row 2: Date + Motivo */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{format(parseISO(ind.data_indicacao), "dd/MM/yy", { locale: ptBR })}</span>
                {ind.motivo_abordagem && (
                  <span className="text-[10px]">{motivoAbordagemLabels[ind.motivo_abordagem as keyof typeof motivoAbordagemLabels]}</span>
                )}
              </div>

              {/* Row 3: Quick actions */}
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
                            window.open(`https://wa.me/${phone}`, "_blank");
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
                          onClick={(e) => handleCopyPhone(e, ind.telefone_indicada!, ind.id)}
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
