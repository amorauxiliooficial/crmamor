import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Copy, Check, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { PlaybookEntrada } from "@/types/playbook";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PlaybookEntradaCardProps {
  entrada: PlaybookEntrada;
  onToggleFavorito: (id: string) => void;
  onEdit?: (entrada: PlaybookEntrada) => void;
  onDelete?: (id: string) => void;
}

export function PlaybookEntradaCard({
  entrada,
  onToggleFavorito,
  onEdit,
  onDelete,
}: PlaybookEntradaCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const respostasCount = entrada.respostas?.length || 0;
  const hasMultipleRespostas = respostasCount > 1;

  const handleCopyAll = async () => {
    const textToCopy = entrada.respostas?.join("\n\n• ") || "";
    await navigator.clipboard.writeText(textToCopy ? "• " + textToCopy : "");
    setCopied(true);
    toast({ title: "Todas as respostas copiadas!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySingle = async (e: React.MouseEvent, resposta: string, index: number) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(resposta);
    setCopiedIndex(index);
    toast({ title: "Resposta copiada!" });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRespostaClick = (e: React.MouseEvent, resposta: string, index: number) => {
    // Se está colapsado e tem múltiplas respostas, expande
    if (hasMultipleRespostas && !isExpanded) {
      setIsExpanded(true);
      return;
    }
    // Se está expandido ou só tem uma resposta, copia
    handleCopySingle(e, resposta, index);
  };

  const displayedRespostas = hasMultipleRespostas && !isExpanded 
    ? entrada.respostas?.slice(0, 1) 
    : entrada.respostas;

  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base font-medium leading-tight">
              {entrada.pergunta}
            </CardTitle>
            {hasMultipleRespostas && (
              <Badge variant="outline" className="mt-2 text-xs">
                {respostasCount} respostas
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleFavorito(entrada.id)}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  entrada.is_favorito
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                )}
              />
            </Button>
            {hasMultipleRespostas && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyAll}
                title="Copiar todas as respostas"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit?.(entrada)}
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete?.(entrada.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        {entrada.categoria && (
          <Badge variant="secondary" className="mt-1 w-fit">
            {entrada.categoria.nome}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {/* Quando colapsado, mostra preview clicável */}
        {hasMultipleRespostas && !isExpanded && entrada.respostas?.[0] && (
          <div 
            className="flex items-start gap-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-md p-2 cursor-pointer transition-colors border border-dashed border-muted-foreground/30"
            onClick={() => setIsExpanded(true)}
            title="Clique para ver todas as respostas"
          >
            <span className="text-primary font-bold shrink-0">•</span>
            <span className="whitespace-pre-wrap flex-1 line-clamp-2">{entrada.respostas[0]}</span>
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              <ChevronDown className="h-4 w-4" />
              +{respostasCount - 1}
            </span>
          </div>
        )}

        {/* Quando expandido ou só tem uma resposta, mostra cada uma em card separado */}
        {((hasMultipleRespostas && isExpanded) || !hasMultipleRespostas) && entrada.respostas && entrada.respostas.length > 0 && (
          <div className="space-y-3">
            {entrada.respostas.map((resposta, index) => (
              <div 
                key={index} 
                className="group/item bg-muted/30 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={(e) => handleCopySingle(e, resposta, index)}
                title="Clique para copiar"
              >
                <div className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <span className="whitespace-pre-wrap flex-1 text-sm text-foreground">{resposta}</span>
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMultipleRespostas && isExpanded && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Recolher
          </Button>
        )}

        {entrada.tags && entrada.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {entrada.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
