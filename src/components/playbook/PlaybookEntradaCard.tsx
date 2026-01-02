import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Copy, Check, Pencil, Trash2 } from "lucide-react";
import { PlaybookEntrada } from "@/types/playbook";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PlaybookEntradaCardProps {
  entrada: PlaybookEntrada;
  isAdmin: boolean;
  onToggleFavorito: (id: string) => void;
  onEdit?: (entrada: PlaybookEntrada) => void;
  onDelete?: (id: string) => void;
}

export function PlaybookEntradaCard({
  entrada,
  isAdmin,
  onToggleFavorito,
  onEdit,
  onDelete,
}: PlaybookEntradaCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(entrada.resposta);
    setCopied(true);
    toast({ title: "Resposta copiada!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-medium leading-tight">
            {entrada.pergunta}
          </CardTitle>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            {isAdmin && (
              <>
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
              </>
            )}
          </div>
        </div>
        {entrada.categoria && (
          <Badge variant="secondary" className="mt-1 w-fit">
            {entrada.categoria.nome}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {entrada.resposta}
        </p>
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
