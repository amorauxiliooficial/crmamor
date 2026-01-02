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
    <div className="relative">
      {/* Pergunta - Nó principal do fluxograma */}
      <div 
        className="cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="bg-primary text-primary-foreground rounded-xl px-4 py-3 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium opacity-70">Pergunta / Objeção</span>
                {respostasCount > 1 && (
                  <Badge variant="secondary" className="text-xs bg-primary-foreground/20 text-primary-foreground border-0">
                    {respostasCount} opções
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium leading-relaxed">
                {entrada.pergunta}
              </p>
              {entrada.categoria && (
                <Badge variant="secondary" className="mt-2 text-xs bg-primary-foreground/20 text-primary-foreground border-0">
                  {entrada.categoria.nome}
                </Badge>
              )}
            </div>
            <ChevronDown 
              className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-300",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </div>
      </div>

      {/* Conector vertical principal */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {/* Linha vertical do fluxograma */}
        <div className="flex justify-center">
          <div className="w-0.5 h-4 bg-border" />
        </div>

        {/* Respostas como nós do fluxograma */}
        <div className="relative">
          {entrada.respostas && entrada.respostas.length > 0 && entrada.respostas.map((resposta, index) => (
            <div key={index} className="relative">
              {/* Conector entre respostas */}
              {index > 0 && (
                <div className="flex justify-center">
                  <div className="w-0.5 h-3 bg-border" />
                </div>
              )}
              
              {/* Nó da resposta */}
              <div className="flex items-start">
                {/* Indicador de ramificação */}
                <div className="flex items-center shrink-0 mr-2">
                  <div className="w-4 h-0.5 bg-border" />
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 transition-colors",
                    copiedIndex === index 
                      ? "bg-green-500 border-green-500 text-white" 
                      : "bg-background border-primary text-primary"
                  )}>
                    {copiedIndex === index ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="w-2 h-0.5 bg-border" />
                </div>

                {/* Card da resposta */}
                <div 
                  className="flex-1 group/item cursor-pointer"
                  onClick={(e) => handleCopySingle(e, resposta, index)}
                  title="Clique para copiar"
                >
                  <div className={cn(
                    "bg-muted border border-border rounded-xl px-4 py-3 transition-all hover:border-primary hover:shadow-md",
                    copiedIndex === index && "border-green-500 bg-green-50 dark:bg-green-950"
                  )}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-primary">Resposta {index + 1}</span>
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{resposta}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tags */}
        {entrada.tags && entrada.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 ml-14">
            {entrada.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-1 mt-3 ml-14">
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
              <span className="ml-1 text-xs">Copiar todas</span>
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
