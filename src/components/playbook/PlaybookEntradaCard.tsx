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

  const handleCopySingle = async (resposta: string, index: number) => {
    await navigator.clipboard.writeText(resposta);
    setCopiedIndex(index);
    toast({ title: "Resposta copiada!" });
    setTimeout(() => setCopiedIndex(null), 2000);
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
        {displayedRespostas && displayedRespostas.length > 0 && (
          <ul className="space-y-2">
            {displayedRespostas.map((resposta, index) => (
              <li 
                key={index} 
                className="group/item flex items-start gap-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-md p-1 -m-1 cursor-pointer transition-colors"
                onClick={() => handleCopySingle(resposta, index)}
                title="Clique para copiar"
              >
                <span className="text-primary font-bold shrink-0">•</span>
                <span className="whitespace-pre-wrap flex-1">{resposta}</span>
                {copiedIndex === index ? (
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                )}
              </li>
            ))}
          </ul>
        )}

        {hasMultipleRespostas && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Recolher
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver mais {respostasCount - 1} {respostasCount - 1 === 1 ? "resposta" : "respostas"}
              </>
            )}
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
