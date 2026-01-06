import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingItem } from "@/types/onboarding";
import { Plus, Trash2, GripVertical, Loader2, Upload, Play, FileText, PenLine, FileCheck, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface OnboardingAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function OnboardingAdminDialog({
  open,
  onOpenChange,
  onRefresh,
}: OnboardingAdminDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState({
    titulo: "",
    descricao: "",
    categoria: "treinamento" as "treinamento" | "documentacao" | "geral",
    tipo: "checklist" as "checklist" | "video" | "documento" | "assinatura",
    url_video: "",
    arquivo_url: "",
    requer_assinatura: false,
    tempo_estimado: 5,
  });

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("onboarding_items")
      .select("*")
      .order("ordem", { ascending: true });

    if (error) {
      console.error("Error fetching items:", error);
    } else {
      setItems(data as OnboardingItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchItems();
    }
  }, [open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `manuais/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("onboarding-files")
      .upload(filePath, file);

    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: uploadError.message,
      });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("onboarding-files")
      .getPublicUrl(filePath);

    setNewItem({ ...newItem, arquivo_url: urlData.publicUrl });
    toast({
      title: "Arquivo enviado",
      description: "O arquivo foi carregado com sucesso.",
    });
    setUploading(false);
  };

  const handleAddItem = async () => {
    if (!newItem.titulo.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O título é obrigatório.",
      });
      return;
    }

    setSaving(true);
    const maxOrdem = Math.max(...items.map((i) => i.ordem), 0);

    const { error } = await supabase.from("onboarding_items").insert({
      titulo: newItem.titulo,
      descricao: newItem.descricao || null,
      categoria: newItem.categoria,
      tipo: newItem.tipo,
      url_video: newItem.url_video || null,
      arquivo_url: newItem.arquivo_url || null,
      requer_assinatura: newItem.requer_assinatura,
      tempo_estimado: newItem.tempo_estimado,
      ordem: maxOrdem + 1,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar",
        description: error.message,
      });
    } else {
      toast({
        title: "Item adicionado",
        description: "O item de onboarding foi criado com sucesso.",
      });
      setNewItem({
        titulo: "",
        descricao: "",
        categoria: "treinamento",
        tipo: "checklist",
        url_video: "",
        arquivo_url: "",
        requer_assinatura: false,
        tempo_estimado: 5,
      });
      fetchItems();
      onRefresh();
    }
    setSaving(false);
  };

  const handleToggleActive = async (item: OnboardingItem) => {
    const { error } = await supabase
      .from("onboarding_items")
      .update({ ativo: !item.ativo })
      .eq("id", item.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    } else {
      fetchItems();
      onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("onboarding_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    } else {
      toast({
        title: "Item excluído",
        description: "O item foi removido com sucesso.",
      });
      fetchItems();
      onRefresh();
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Reorder locally first for immediate UI feedback
    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(sourceIndex, 1);
    reorderedItems.splice(destinationIndex, 0, movedItem);

    // Update local state
    setItems(reorderedItems);

    // Update order in database
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      ordem: index + 1,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from("onboarding_items")
        .update({ ordem: update.ordem })
        .eq("id", update.id);

      if (error) {
        console.error("Error updating order:", error);
        toast({
          variant: "destructive",
          title: "Erro ao reordenar",
          description: "Não foi possível salvar a nova ordem.",
        });
        fetchItems(); // Revert to original order
        return;
      }
    }

    toast({
      title: "Ordem atualizada",
      description: "Os itens foram reordenados com sucesso.",
    });
    onRefresh();
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case "video":
        return <Play className="h-4 w-4 text-red-500" />;
      case "documento":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "assinatura":
        return <PenLine className="h-4 w-4 text-purple-500" />;
      default:
        return <FileCheck className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCategoryLabel = (categoria: string) => {
    switch (categoria) {
      case "treinamento":
        return "Treinamento";
      case "documentacao":
        return "Documentação";
      default:
        return "Geral";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Gerenciar Itens de Onboarding</DialogTitle>
          <DialogDescription>
            Adicione treinamentos, documentos, vídeos e controle de assinaturas.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="add" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">Adicionar Novo</TabsTrigger>
            <TabsTrigger value="manage">Gerenciar Itens</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={newItem.titulo}
                    onChange={(e) =>
                      setNewItem({ ...newItem, titulo: e.target.value })
                    }
                    placeholder="Ex: Treinamento de segurança"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select
                    value={newItem.categoria}
                    onValueChange={(value) =>
                      setNewItem({
                        ...newItem,
                        categoria: value as "treinamento" | "documentacao" | "geral",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="treinamento">Treinamento</SelectItem>
                      <SelectItem value="documentacao">Documentação</SelectItem>
                      <SelectItem value="geral">Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={newItem.descricao}
                  onChange={(e) =>
                    setNewItem({ ...newItem, descricao: e.target.value })
                  }
                  placeholder="Descrição breve do item"
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tipo">Tipo do Item</Label>
                <Select
                  value={newItem.tipo}
                  onValueChange={(value) =>
                    setNewItem({
                      ...newItem,
                      tipo: value as "checklist" | "video" | "documento" | "assinatura",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checklist">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        Checklist simples
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-red-500" />
                        Vídeo (YouTube, Vimeo, etc.)
                      </div>
                    </SelectItem>
                    <SelectItem value="documento">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        Documento/Manual (PDF)
                      </div>
                    </SelectItem>
                    <SelectItem value="assinatura">
                      <div className="flex items-center gap-2">
                        <PenLine className="h-4 w-4 text-purple-500" />
                        Documento para assinar
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newItem.tipo === "video" && (
                <div className="grid gap-2">
                  <Label htmlFor="url_video">Link do Vídeo</Label>
                  <Input
                    id="url_video"
                    value={newItem.url_video}
                    onChange={(e) =>
                      setNewItem({ ...newItem, url_video: e.target.value })
                    }
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              )}

              {(newItem.tipo === "documento" || newItem.tipo === "assinatura") && (
                <div className="grid gap-2">
                  <Label>Arquivo (PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newItem.arquivo_url}
                      onChange={(e) =>
                        setNewItem({ ...newItem, arquivo_url: e.target.value })
                      }
                      placeholder="URL do arquivo ou faça upload"
                      className="flex-1"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {newItem.tipo === "assinatura" && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newItem.requer_assinatura}
                    onCheckedChange={(checked) =>
                      setNewItem({ ...newItem, requer_assinatura: checked })
                    }
                  />
                  <Label>Exigir confirmação de assinatura</Label>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="tempo_estimado" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tempo estimado (minutos)
                </Label>
                <Input
                  id="tempo_estimado"
                  type="number"
                  min={1}
                  max={120}
                  value={newItem.tempo_estimado}
                  onChange={(e) =>
                    setNewItem({ ...newItem, tempo_estimado: parseInt(e.target.value) || 5 })
                  }
                  placeholder="5"
                />
                <p className="text-xs text-muted-foreground">
                  Usado para calcular o tempo total de conclusão do onboarding
                </p>
              </div>

              <Button onClick={handleAddItem} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar item
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manage" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="onboarding-items">
                  {(provided) => (
                    <div 
                      className="h-[400px] overflow-y-scroll scrollbar-always-visible pr-2"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      <div className="space-y-2 pr-2">
                        {items.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-3 p-3 border rounded-lg transition-shadow ${
                                  item.ativo ? "bg-background" : "bg-muted/50 opacity-60"
                                } ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : ""}`}
                              >
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab hover:text-foreground transition-colors" />
                                </div>
                                {getTypeIcon(item.tipo)}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{item.titulo}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {getCategoryLabel(item.categoria)}
                                    {item.tempo_estimado && ` • ${item.tempo_estimado} min`}
                                    {item.url_video && " • Com vídeo"}
                                    {item.arquivo_url && " • Com arquivo"}
                                    {item.requer_assinatura && " • Requer assinatura"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={item.ativo}
                                    onCheckedChange={() => handleToggleActive(item)}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(item.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
