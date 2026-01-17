import { useTiposConteudo } from "@/hooks/useMarketing";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TiposConteudoLegenda() {
  const { data: tipos = [] } = useTiposConteudo();

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
        TIPOS DE CONTEÚDO
      </h3>
      <ScrollArea className="h-[200px] pr-2">
        <div className="flex flex-wrap gap-2">
          {tipos.map((tipo) => (
            <Badge
              key={tipo.id}
              variant="outline"
              className="text-xs font-normal whitespace-nowrap"
              style={{
                borderColor: tipo.cor,
                color: tipo.cor,
              }}
            >
              {tipo.nome}
            </Badge>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-4 pt-4 border-t">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
          INSTAGRAM
        </h3>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary/20 text-primary border-primary">
            Feed
          </Badge>
          <Badge className="bg-chart-2/20 text-chart-2 border-chart-2">
            Stories
          </Badge>
          <Badge className="bg-chart-4/20 text-chart-4 border-chart-4">
            Reels
          </Badge>
        </div>
      </div>
    </div>
  );
}
