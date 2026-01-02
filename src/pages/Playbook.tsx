import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlaybook } from "@/hooks/usePlaybook";
import { Header } from "@/components/layout/Header";
import { PlaybookChatCard } from "@/components/playbook/PlaybookChatCard";
import { PlaybookEntradaDialog } from "@/components/playbook/PlaybookEntradaDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Search, Star, ArrowLeft } from "lucide-react";
import { PlaybookEntrada } from "@/types/playbook";
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

export default function Playbook() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    categorias,
    entradas,
    loading,
    toggleFavorito,
    addEntrada,
    updateEntrada,
    deleteEntrada,
  } = usePlaybook();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all");
  const [showFavoritos, setShowFavoritos] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntrada, setEditingEntrada] = useState<PlaybookEntrada | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const removeAccents = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const filteredEntradas = useMemo(() => {
    let filtered = entradas;

    // Filter by favoritos
    if (showFavoritos) {
      filtered = filtered.filter((e) => e.is_favorito);
    }

    // Filter by categoria
    if (selectedCategoria !== "all") {
      filtered = filtered.filter((e) => e.categoria_id === selectedCategoria);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = removeAccents(searchQuery.toLowerCase());
      filtered = filtered.filter((e) => {
        const perguntaMatch = removeAccents(e.pergunta.toLowerCase()).includes(query);
        const respostaMatch = removeAccents(e.resposta.toLowerCase()).includes(query);
        const tagsMatch = e.tags?.some((t) =>
          removeAccents(t.toLowerCase()).includes(query)
        );
        return perguntaMatch || respostaMatch || tagsMatch;
      });
    }

    return filtered;
  }, [entradas, searchQuery, selectedCategoria, showFavoritos]);

  const handleSave = (data: { pergunta: string; resposta: string; categoria_id?: string; tags?: string[] }) => {
    if (editingEntrada) {
      updateEntrada(editingEntrada.id, data);
    } else {
      addEntrada(data);
    }
    setEditingEntrada(null);
  };

  const handleEdit = (entrada: PlaybookEntrada) => {
    setEditingEntrada(entrada);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteEntrada(deleteId);
      setDeleteId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery="" onSearchChange={() => {}} onAddMae={() => {}} />

      <main className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Playbook de Vendas</h1>
              <p className="text-muted-foreground">
                Respostas para objeções e dúvidas frequentes
              </p>
            </div>
          </div>
          <Button onClick={() => { setEditingEntrada(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Entrada
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar perguntas, respostas ou tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFavoritos ? "default" : "outline"}
            onClick={() => setShowFavoritos(!showFavoritos)}
            className="gap-2"
          >
            <Star className={showFavoritos ? "fill-current" : ""} />
            Favoritos
          </Button>
        </div>

        {/* Categories Tabs */}
        <Tabs value={selectedCategoria} onValueChange={setSelectedCategoria}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">
              Todas
              <Badge variant="secondary" className="ml-2">
                {entradas.length}
              </Badge>
            </TabsTrigger>
            {categorias.map((cat) => {
              const count = entradas.filter((e) => e.categoria_id === cat.id).length;
              return (
                <TabsTrigger key={cat.id} value={cat.id}>
                  {cat.nome}
                  <Badge variant="secondary" className="ml-2">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedCategoria} className="mt-6">
            {filteredEntradas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery
                  ? "Nenhum resultado encontrado para sua busca"
                  : showFavoritos
                  ? "Você ainda não tem favoritos"
                  : "Nenhuma entrada cadastrada nesta categoria"}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-6 bg-card rounded-xl p-6 border shadow-sm">
                {filteredEntradas.map((entrada) => (
                  <PlaybookChatCard
                    key={entrada.id}
                    entrada={entrada}
                    onToggleFavorito={toggleFavorito}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <PlaybookEntradaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categorias={categorias}
        entrada={editingEntrada}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta entrada? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
