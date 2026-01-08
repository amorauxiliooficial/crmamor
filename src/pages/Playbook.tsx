import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlaybook } from "@/hooks/usePlaybook";
import { usePlaybookTour } from "@/hooks/usePlaybookTour";
import { Header } from "@/components/layout/Header";
import { PlaybookChatCard } from "@/components/playbook/PlaybookChatCard";
import { PlaybookEntradaDialog } from "@/components/playbook/PlaybookEntradaDialog";
import { PlaybookImportDialog } from "@/components/playbook/PlaybookImportDialog";
import { PlaybookTour } from "@/components/tour/PlaybookTour";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Search, Star, ArrowLeft, Upload, FileText, ChevronDown, HelpCircle } from "lucide-react";
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
    importEntradas,
    updateEntrada,
    deleteEntrada,
  } = usePlaybook();
  const { run: tourRun, stepIndex, setStepIndex, stopTour, startTour } = usePlaybookTour();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all");
  const [showFavoritos, setShowFavoritos] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
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
        const respostasMatch = e.respostas?.some((r) =>
          removeAccents(r.toLowerCase()).includes(query)
        );
        const tagsMatch = e.tags?.some((t) =>
          removeAccents(t.toLowerCase()).includes(query)
        );
        return perguntaMatch || respostasMatch || tagsMatch;
      });
    }

    return filtered;
  }, [entradas, searchQuery, selectedCategoria, showFavoritos]);

  const handleSave = (data: { pergunta: string; respostas: string[]; categoria_id?: string; tags?: string[] }) => {
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
      <PlaybookTour
        run={tourRun}
        stepIndex={stepIndex}
        onStepChange={setStepIndex}
        onFinish={stopTour}
      />
      <Header searchQuery="" onSearchChange={() => {}} onAddMae={() => {}} />

      <main className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 tour-playbook-header">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 md:h-10 md:w-10">
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <div>
              <h1 className="text-lg md:text-2xl font-bold">Playbook de Vendas</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Respostas para objeções e dúvidas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={startTour}
              title="Iniciar tour guiado"
              className="h-8 w-8 p-0"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="tour-playbook-add h-8 md:h-9 text-sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Adicionar</span>
                  <span className="sm:hidden">Novo</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditingEntrada(null); setDialogOpen(true); }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Entrada Manual
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Várias
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
          <div className="relative flex-1 tour-playbook-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar perguntas, respostas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 md:h-10"
            />
          </div>
          <Button
            variant={showFavoritos ? "default" : "outline"}
            onClick={() => setShowFavoritos(!showFavoritos)}
            className="gap-2 tour-playbook-favoritos h-9 md:h-10 shrink-0"
          >
            <Star className={`h-4 w-4 ${showFavoritos ? "fill-current" : ""}`} />
            <span className="hidden sm:inline">Favoritos</span>
          </Button>
        </div>

        {/* Categories Tabs */}
        <Tabs value={selectedCategoria} onValueChange={setSelectedCategoria}>
          <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
            <TabsList className="inline-flex h-auto gap-1 tour-playbook-categories whitespace-nowrap">
              <TabsTrigger value="all" className="text-xs md:text-sm px-2 md:px-3 h-8 md:h-9">
                Todas
                <Badge variant="secondary" className="ml-1.5 text-[10px] md:text-xs h-4 md:h-5 px-1 md:px-1.5">
                  {entradas.length}
                </Badge>
              </TabsTrigger>
              {categorias.map((cat) => {
                const count = entradas.filter((e) => e.categoria_id === cat.id).length;
                return (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-xs md:text-sm px-2 md:px-3 h-8 md:h-9">
                    {cat.nome}
                    <Badge variant="secondary" className="ml-1.5 text-[10px] md:text-xs h-4 md:h-5 px-1 md:px-1.5">
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value={selectedCategoria} className="mt-4 md:mt-6">
            {filteredEntradas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {searchQuery
                  ? "Nenhum resultado encontrado para sua busca"
                  : showFavoritos
                  ? "Você ainda não tem favoritos"
                  : "Nenhuma entrada cadastrada nesta categoria"}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 bg-card rounded-xl p-3 md:p-6 border shadow-sm">
                {filteredEntradas.map((entrada, index) => (
                  <div key={entrada.id} className={index === 0 ? "tour-playbook-card" : ""}>
                    <PlaybookChatCard
                      entrada={entrada}
                      onToggleFavorito={toggleFavorito}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
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

      <PlaybookImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={importEntradas}
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
