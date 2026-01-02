import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Copy, Check, Pencil, Trash2, ChevronDown } from "lucide-react";
import { PlaybookEntrada } from "@/types/playbook";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PlaybookChatCardProps {
  entrada: PlaybookEntrada;
  onToggleFavorito: (id: string) => void;
  onEdit?: (entrada: PlaybookEntrada) => void;
  onDelete?: (id: string) => void;
}

export function PlaybookChatCard({
  entrada,
  onToggleFavorito,
  onEdit,
  onDelete,
}: PlaybookChatCardProps) {
  const { toast } = useToast();
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const respostasCount = entrada.respostas?.length || 0;

  const handleCopyAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = entrada.respostas?.join("\n\n• ") || "";
    await navigator.clipboard.writeText(textToCopy ? "• " + textToCopy : "");
    setCopiedAll(true);
    toast({ title: "Todas as respostas copiadas!" });
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingle = async (e: React.MouseEvent, resposta: string, index: number) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(resposta);
    setCopiedIndex(index);
    toast({ title: "Resposta copiada!" });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Pergunta - estilo mensagem recebida (esquerda) */}
      <div 
        className="flex items-start gap-2 cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 max-w-[85%]">
          <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 relative">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-relaxed pr-6">
                {entrada.pergunta}
              </p>
              <ChevronDown 
                className={cn(
                  "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
            {entrada.categoria && (
              <Badge variant="secondary" className="mt-2 text-xs">
                {entrada.categoria.nome}
              </Badge>
            )}
            {respostasCount > 1 && (
              <Badge variant="outline" className="mt-2 ml-2 text-xs">
                {respostasCount} respostas
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground ml-2 mt-1 block">
            Clique para ver {respostasCount > 1 ? "respostas" : "resposta"}
          </span>
        </div>
      </div>

      {/* Respostas - cada uma em seu próprio balão */}
      <div
        className={cn(
          "space-y-3 overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {entrada.respostas && entrada.respostas.length > 0 && entrada.respostas.map((resposta, index) => (
          <div key={index} className="flex justify-end">
            <div 
              className="max-w-[85%] group/item cursor-pointer"
              onClick={(e) => handleCopySingle(e, resposta, index)}
              title="Clique para copiar"
            >
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 hover:bg-primary/90 transition-colors">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-primary-foreground/20">
                  <span className="bg-primary-foreground/20 text-primary-foreground text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-xs font-medium opacity-80">Resposta {index + 1}</span>
                  <div className="flex-1" />
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-300" />
                  ) : (
                    <Copy className="h-4 w-4 opacity-0 group-hover/item:opacity-70 transition-opacity" />
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{resposta}</p>
              </div>
            </div>
          </div>
        ))}
        
        {/* Tags */}
        {entrada.tags && entrada.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end">
            {entrada.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorito(entrada.id);
            }}
          >
            <Star
              className={cn(
                "h-4 w-4",
                entrada.is_favorito && "fill-yellow-400 text-yellow-400"
              )}
            />
          </Button>
          {respostasCount > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={handleCopyAll}
              title="Copiar todas"
            >
              {copiedAll ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(entrada);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(entrada.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
