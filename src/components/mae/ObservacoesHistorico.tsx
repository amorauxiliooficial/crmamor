import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MessageSquare,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Search,
  Plus,
  X,
  Check,
  AlertTriangle,
  SlidersHorizontal,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useMaeObservacoes,
  CATEGORIA_LABEL,
  CATEGORIA_COLORS,
  type ObservacaoCategoria,
  type MaeObservacao,
} from "@/hooks/useMaeObservacoes";

interface Props {
  maeId: string;
  startOpen?: boolean;
}

const CATEGORIAS_EDITAVEIS: ObservacaoCategoria[] = [
  "ligacao",
  "whatsapp",
  "documento",
  "reuniao",
  "outro",
];

const CATEGORIAS_FILTRO: ObservacaoCategoria[] = [
  ...CATEGORIAS_EDITAVEIS,
  "conferencia",
];

function formatDateTime(iso: string) {
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

export function ObservacoesHistorico({ maeId, startOpen = false }: Props) {
  const { user } = useAuth();
  const { data: observacoes = [], isLoading, create, update, togglePin, remove, refetch } =
    useMaeObservacoes(maeId);

  // form
  const [novoTexto, setNovoTexto] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<ObservacaoCategoria>("outro");
  const [showComposer, setShowComposer] = useState(startOpen);
  const [showFilters, setShowFilters] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // filtros
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("all");
  const [filtroAutor, setFiltroAutor] = useState<string>("all");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");

  // edição
  const [editando, setEditando] = useState<MaeObservacao | null>(null);
  const [editTexto, setEditTexto] = useState("");
  const [editCategoria, setEditCategoria] = useState<ObservacaoCategoria>("outro");

  // confirmação de exclusão
  const [confirmDelete, setConfirmDelete] = useState<MaeObservacao | null>(null);

  const autoresUnicos = useMemo(() => {
    const set = new Map<string, string>();
    observacoes.forEach((o) => set.set(o.autor_id ?? "system", o.autor_nome));
    return Array.from(set.entries());
  }, [observacoes]);

  const filtradas = useMemo(() => {
    return observacoes.filter((o) => {
      if (busca && !o.texto.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroCategoria !== "all" && o.categoria !== filtroCategoria) return false;
      if (filtroAutor !== "all" && (o.autor_id ?? "system") !== filtroAutor) return false;
      if (dataIni && new Date(o.created_at) < new Date(dataIni)) return false;
      if (dataFim && new Date(o.created_at) > new Date(dataFim + "T23:59:59")) return false;
      return true;
    });
  }, [observacoes, busca, filtroCategoria, filtroAutor, dataIni, dataFim]);

  const fixadas = filtradas.filter((o) => o.fixada);
  const restantes = filtradas.filter((o) => !o.fixada);

  const handleAdd = () => {
    if (!novoTexto.trim()) return;
    create.mutate(
      { texto: novoTexto, categoria: novaCategoria },
      {
        onSuccess: () => {
          setNovoTexto("");
          setNovaCategoria("outro");
          setShowComposer(false);
        },
      }
    );
  };

  const startEdit = (o: MaeObservacao) => {
    setEditando(o);
    setEditTexto(o.texto);
    setEditCategoria(o.categoria);
  };

  const saveEdit = () => {
    if (!editando || !editTexto.trim()) return;
    update.mutate(
      { id: editando.id, texto: editTexto, categoria: editCategoria },
      { onSuccess: () => setEditando(null) }
    );
  };

  const canModify = (o: MaeObservacao) =>
    !!user &&
    !o.conferencia_id &&
    (o.autor_id === user.id || (!o.autor_id && o.autor_nome === "ZapResponder · Resumo IA"));

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke("zap-conversation-summary", {
        body: { action: "generate_now", mae_id: maeId },
      });
      if (error) throw error;
      if (data?.skipped) {
        const message = data.reason === "mother_without_phone"
          ? "Esta mãe não possui telefone vinculado."
          : "Ainda não há mensagens de texto do ZapResponder para resumir hoje.";
        toast.info(message);
        return;
      }
      toast.success("Resumo da conversa gerado com IA");
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o resumo agora");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const renderItem = (o: MaeObservacao) => {
    const isEditing = editando?.id === o.id;
    return (
      <div
        key={o.id}
        className={cn(
          "grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-3 border-b py-4 transition-colors last:border-b-0",
          o.fixada && "rounded-lg border border-primary/30 bg-primary/5 px-3"
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("text-xs", CATEGORIA_COLORS[o.categoria])}
            >
              {CATEGORIA_LABEL[o.categoria]}
            </Badge>
            {o.fixada && (
              <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                <Pin className="h-3 w-3 mr-1" /> Fixada
              </Badge>
            )}
            {o.autor_nome === "ZapResponder · Resumo IA" && (
              <Badge
                variant="outline"
                className="border-violet-500/30 bg-violet-500/10 text-xs text-violet-700"
              >
                <Sparkles className="mr-1 h-3 w-3" /> Resumo IA
              </Badge>
            )}
          </div>
          {canModify(o) && !isEditing && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title={o.fixada ? "Desafixar" : "Fixar"}
                onClick={() => togglePin.mutate({ id: o.id, fixada: !o.fixada })}
              >
                {o.fixada ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Editar"
                onClick={() => startEdit(o)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                title="Excluir"
                onClick={() => setConfirmDelete(o)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editTexto}
              onChange={(e) => setEditTexto(e.target.value)}
              rows={3}
              className="text-sm"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={editCategoria}
                onValueChange={(v) => setEditCategoria(v as ObservacaoCategoria)}
              >
                <SelectTrigger className="h-8 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {CATEGORIAS_EDITAVEIS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORIA_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={saveEdit} disabled={update.isPending}>
                <Check className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditando(null)}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{o.texto}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
          <span className="break-words">
            <span className="font-medium">{o.autor_nome}</span> ·{" "}
            {formatDateTime(o.created_at)}
          </span>
          {o.editada_em && (
            <span className="italic">editada em {formatDateTime(o.editada_em)}</span>
          )}
        </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h4 className="font-semibold">Observações & Histórico</h4>
          <p className="mt-1 text-sm text-muted-foreground">Contatos, conferências e atualizações em ordem cronológica.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="secondary" className="text-xs">{observacoes.length}</Badge>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => void handleGenerateSummary()}
            disabled={isGeneratingSummary}
          >
            {isGeneratingSummary
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Sparkles className="h-4 w-4" />}
            Gerar resumo agora
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setShowComposer(true)}>
            <Plus className="h-4 w-4" /> Nova anotação
          </Button>
        </div>
      </div>

      {/* Nova anotação */}
      {showComposer && (
      <div className="space-y-3 border-y py-3">
        <Textarea
          placeholder="Registre uma atualização objetiva..."
          value={novoTexto}
          onChange={(e) => setNovoTexto(e.target.value)}
          rows={3}
          className="min-h-20 resize-none text-sm"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Select
            value={novaCategoria}
            onValueChange={(v) => setNovaCategoria(v as ObservacaoCategoria)}
          >
            <SelectTrigger className="h-9 w-44 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {CATEGORIAS_EDITAVEIS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORIA_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowComposer(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAdd} disabled={!novoTexto.trim() || create.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Filtros */}
      {observacoes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b pb-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-9 w-full pl-7 text-sm sm:w-64"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilters((value) => !value)}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
          </Button>
          {showFilters && (
          <div className="grid w-full grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIAS_FILTRO.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORIA_LABEL[c]}
                </SelectItem>
              ))}
              <SelectItem value="importado">Importado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroAutor} onValueChange={setFiltroAutor}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Autor" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="all">Todos os autores</SelectItem>
              {autoresUnicos.map(([id, nome]) => (
                <SelectItem key={id} value={id}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={dataIni}
              onChange={(e) => setDataIni(e.target.value)}
              className="h-9 text-xs"
              title="Data inicial"
            />
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-9 text-xs"
              title="Data final"
            />
          </div>
          </div>
          )}
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {observacoes.length === 0
            ? "Nenhuma anotação ainda. Adicione a primeira acima."
            : "Nenhuma anotação corresponde aos filtros."}
        </p>
      ) : (
        <div>
          {fixadas.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Pin className="h-3 w-3" /> Fixadas
              </div>
              <div>{fixadas.map(renderItem)}</div>
              {restantes.length > 0 && <Separator />}
            </>
          )}
          {restantes.length > 0 && (
            <div>{restantes.map(renderItem)}</div>
          )}
        </div>
      )}

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir anotação?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>A anotação abaixo será removida do histórico:</p>
                {confirmDelete && (
                  <div className="rounded-md border bg-muted/50 p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">
                      {confirmDelete.autor_nome} ·{" "}
                      {formatDateTime(confirmDelete.created_at)}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {confirmDelete.texto}
                    </div>
                  </div>
                )}
                <p className="text-xs">
                  A exclusão fica registrada no log (soft delete).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  remove.mutate(confirmDelete.id);
                  setConfirmDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
