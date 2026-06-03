import { Indicacao, statusAbordagemLabels, statusAbordagemColors, origemIndicacaoLabels, origemIndicacaoColors, OrigemIndicacao, motivoAbordagemLabels } from "@/types/indicacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Copy, Check, ExternalLink, Eye, AlertCircle } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { normalizePhoneToE164BR } from "@/lib/phoneUtils";
import { formatPhone } from "@/lib/formatters";

interface IndicacaoMobileListProps {
  indicacoes: Indicacao[];
  selectedId?: string | null;
  onSelect: (indicacao: Indicacao) => void;
  loading?: boolean;
}

export function IndicacaoMobileList({ indicacoes, selectedId, onSelect, loading }: IndicacaoMobileListProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (e: React.MouseEvent, value: string, key: string, label: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast({ title: "Copiado!", description: `${label} copiado.` });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  /** Returns the WhatsApp digits (55 + DDD + number) if valid, else null. */
  const getWhatsappDigits = (phone: string | undefined | null): string | null => {
    const e164 = normalizePhoneToE164BR(phone || "");
    if (!e164) return null;
    return e164.replace(/\D/g, ""); // already 55XXXXXXXXXXX
  };

  const duplicatePhones = useMemo(() => {
    const counts = new Map<string, number>();
    indicacoes.forEach((ind) => {
      const p = ind.telefone_indicada?.replace(/\D/g, "") || "";
      if (p) counts.set(p, (counts.get(p) || 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, c]) => c > 1)
        .map(([p]) => p)
    );
  }, [indicacoes]);

  const isSelfReferral = (ind: Indicacao) => {
    const a = ind.nome_indicada?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const b = ind.nome_indicadora?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return a && b && a === b;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={`skel-${i}`}>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-1 pt-1 border-t">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
                <div className="flex-1" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (indicacoes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhuma indicação encontrada — ajuste os filtros
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {indicacoes.map((ind) => {
          const origem = (ind.origem_indicacao || "interna") as OrigemIndicacao;
          const rawPhoneDigits = ind.telefone_indicada?.replace(/\D/g, "") || "";
          const waDigits = getWhatsappDigits(ind.telefone_indicada);
          const phoneValid = !!waDigits;
          const isSelected = selectedId === ind.id;

          return (
            <Card
              key={ind.id}
              className={`cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : ""}`}
              onClick={() => onSelect(ind)}
            >
              <CardContent className="p-3 space-y-2">
                {/* Row 1: Indicada name + copy-name + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate">{ind.nome_indicada}</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={(e) => handleCopy(e, ind.nome_indicada, `name-${ind.id}`, "Nome")}
                            aria-label="Copiar nome da indicada"
                          >
                            {copiedKey === `name-${ind.id}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar nome</TooltipContent>
                      </Tooltip>
                      {isSelfReferral(ind) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 text-[10px] px-1 py-0 h-5 shrink-0">
                              Auto
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Possível auto-indicação</TooltipContent>
                        </Tooltip>
                      )}
                      {phoneValid && duplicatePhones.has(rawPhoneDigits) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 text-[10px] px-1 py-0 h-5 shrink-0">
                              Dup
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Telefone duplicado</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
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

                {/* Row 2: Phone display + copy-number + WhatsApp, OR incomplete tag */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {phoneValid ? (
                    <>
                      <span className="text-xs font-mono whitespace-nowrap">{formatPhone(ind.telefone_indicada!)}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={(e) => handleCopy(e, ind.telefone_indicada!, `phone-${ind.id}`, "Telefone")}
                            aria-label="Copiar telefone da indicada"
                          >
                            {copiedKey === `phone-${ind.id}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar telefone</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://wa.me/${waDigits}`, "_blank");
                            }}
                            aria-label="Abrir WhatsApp da indicada"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                            WhatsApp
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Abrir WhatsApp</TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 text-[10px] px-1.5 py-0 h-5">
                      Número incompleto
                    </Badge>
                  )}
                </div>

                {/* Row 3: Date + Motivo + Próximo passo */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>{format(parseISO(ind.data_indicacao), "dd/MM/yy", { locale: ptBR })}</span>
                    {(ind.status_abordagem === "pendente" || ind.status_abordagem === "aguardando_aprovacao") && (() => {
                      const dias = differenceInDays(new Date(), parseISO(ind.data_indicacao));
                      const cor = dias > 14 ? "text-red-600 dark:text-red-400" : dias > 7 ? "text-amber-600 dark:text-amber-400" : "";
                      return (
                        <span className={`flex items-center gap-0.5 ${cor}`}>
                          {dias > 14 && <AlertCircle className="h-3 w-3" />}
                          há {dias} {dias === 1 ? "dia" : "dias"}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    {ind.motivo_abordagem && (
                      <span className="text-[10px]">{motivoAbordagemLabels[ind.motivo_abordagem as keyof typeof motivoAbordagemLabels]}</span>
                    )}
                    <span className="text-[10px] italic">
                      {ind.status_abordagem === "aguardando_aprovacao" && "Entrar em contato"}
                      {ind.status_abordagem === "pendente" && "Retomar contato"}
                      {ind.status_abordagem === "em_andamento" && "Acompanhar"}
                      {ind.status_abordagem === "concluido" && "-"}
                    </span>
                  </div>
                </div>

                {/* Row 4: Details action */}
                <div className="flex items-center pt-1 border-t">
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
    </TooltipProvider>
  );
}
