import { useState, useEffect } from "react";
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
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({
    titulo: "",
    descricao: "",
    categoria: "geral" as "treinamento" | "documentacao" | "geral",
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
      setNewItem({ titulo: "", descricao: "", categoria: "geral" });
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
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Gerenciar Itens de Onboarding</DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova itens do checklist de onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new item form */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium">Adicionar novo item</h4>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="titulo">Título</Label>
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
                <Label htmlFor="descricao">Descrição (opcional)</Label>
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
              <Button onClick={handleAddItem} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar item
              </Button>
            </div>
          </div>

          {/* Existing items list */}
          <div className="space-y-2">
            <h4 className="font-medium">Itens existentes</h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg ${
                        item.ativo ? "bg-background" : "bg-muted/50 opacity-60"
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryLabel(item.categoria)}
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
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
