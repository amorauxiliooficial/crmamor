import { useEffect, useState, useMemo } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  MessageSquare, UserCheck, Clock, CheckCircle, Tag, Search,
  Plus, Filter, UserX, FileText,
} from "lucide-react";
import type { Conversa } from "@/data/atendimentoMock";
import type { RespostaRapida } from "@/data/respostasRapidas";

interface CommandPaletteProps {
  conversas: Conversa[];
  respostas: RespostaRapida[];
  onSelectConversa: (id: string) => void;
  onAssumir: (id: string) => void;
  onPendente: (id: string) => void;
  onFinalizar: (id: string) => void;
  onFilterPendentes: () => void;
  onFilterSemAtendente: () => void;
  onInsertTemplate: (texto: string) => void;
}

export function CommandPalette({
  conversas,
  respostas,
  onSelectConversa,
  onAssumir,
  onPendente,
  onFinalizar,
  onFilterPendentes,
  onFilterSemAtendente,
  onInsertTemplate,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar conversas, ações ou templates..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Conversas">
          {conversas.slice(0, 8).map((c) => (
            <CommandItem
              key={c.id}
              value={`${c.nome ?? ""} ${c.telefone} ${c.ultimaMensagem} ${c.etiquetas.join(" ")}`}
              onSelect={() => run(() => onSelectConversa(c.id))}
            >
              <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium truncate">{c.nome ?? c.telefone}</span>
                <span className="text-xs text-muted-foreground truncate">{c.ultimaMensagem}</span>
              </div>
              {c.etiquetas.length > 0 && (
                <span className="ml-2 text-[10px] text-muted-foreground">{c.etiquetas[0]}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ações rápidas">
          <CommandItem onSelect={() => run(onFilterPendentes)}>
            <Clock className="mr-2 h-4 w-4 text-yellow-500" />
            Ir para Pendentes
          </CommandItem>
          <CommandItem onSelect={() => run(onFilterSemAtendente)}>
            <UserX className="mr-2 h-4 w-4 text-destructive" />
            Ver sem atendente
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ações na conversa ativa">
          <CommandItem onSelect={() => run(() => onAssumir(""))}>
            <UserCheck className="mr-2 h-4 w-4 text-blue-500" />
            Assumir conversa
          </CommandItem>
          <CommandItem onSelect={() => run(() => onPendente(""))}>
            <Clock className="mr-2 h-4 w-4 text-yellow-500" />
            Marcar como Pendente
          </CommandItem>
          <CommandItem onSelect={() => run(() => onFinalizar(""))}>
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            Finalizar conversa
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Templates rápidos">
          {respostas.map((r) => (
            <CommandItem key={r.id} onSelect={() => run(() => onInsertTemplate(r.texto))}>
              <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium">/{r.atalho}</span>
                <span className="text-xs text-muted-foreground truncate">{r.titulo}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
