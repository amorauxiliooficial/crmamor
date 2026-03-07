import { useState } from "react";
import { AlertCircle, Check, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MisspelledWord {
  word: string;
  index: number;
  suggestions: string[];
}

interface SpellCheckBadgeProps {
  misspelled: MisspelledWord[];
  isLoading: boolean;
  onApplySuggestion: (original: string, suggestion: string) => void;
  onApplyAll: () => void;
}

export function SpellCheckBadge({
  misspelled,
  isLoading,
  onApplySuggestion,
  onApplyAll,
}: SpellCheckBadgeProps) {
  const [open, setOpen] = useState(false);

  if (isLoading || misspelled.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
            "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
            "animate-in fade-in zoom-in-95 duration-200"
          )}
        >
          <AlertCircle className="h-3 w-3" />
          {misspelled.length} {misspelled.length === 1 ? "erro" : "erros"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        side="top"
        align="start"
        sideOffset={8}
      >
        <div className="px-3 py-2 border-b border-border/10 flex items-center justify-between">
          <span className="text-xs font-medium text-foreground/70">
            Correções sugeridas
          </span>
          {misspelled.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={() => {
                onApplyAll();
                setOpen(false);
              }}
            >
              <Check className="h-3 w-3" />
              Corrigir tudo
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[200px]">
          <div className="p-1.5 space-y-0.5">
            {misspelled.map((item, i) => (
              <div
                key={`${item.word}-${item.index}-${i}`}
                className="rounded-lg px-2.5 py-1.5 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-destructive/70 line-through font-mono">
                    {item.word}
                  </span>
                  {item.suggestions.length > 0 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                  )}
                  <div className="flex gap-1 flex-wrap">
                    {item.suggestions.map((s) => (
                      <button
                        key={s}
                        className="text-[11px] px-1.5 py-0.5 rounded-md bg-primary/5 text-primary hover:bg-primary/10 transition-colors font-medium"
                        onClick={() => {
                          onApplySuggestion(item.word, s);
                          if (misspelled.length <= 1) setOpen(false);
                        }}
                      >
                        {s}
                      </button>
                    ))}
                    {item.suggestions.length === 0 && (
                      <span className="text-[10px] text-muted-foreground/40 italic">
                        Sem sugestões
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
