import { useState } from "react";
import { useMetas, MetaConfig } from "@/hooks/useMetas";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Pencil, Trash2, Loader2, Target } from "lucide-react";

interface MetasConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPO_LABELS: Record<string, string> = {
  cadastros: "Novos Cadastros",
  contratos: "Contratos Assinados",
  aprovados: "Processos Aprovados",
  atividades: "Atividades Realizadas",
  follow_ups: "Follow-ups",
};

const PERIODO_LABELS: Record<string, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
};

export function MetasConfigDialog({ open, onOpenChange }: MetasConfigDialogProps) {
  const { toast } = useToast();
  const { metas, loading, updateMeta, createMeta, deleteMeta, refetch } = useMetas();
  
  const [editing, setEditing] = useState<MetaConfig | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoMeta, setTipoMeta] = useState<string>("cadastros");
  const [valorMeta, setValorMeta] = useState("10");
  const [periodo, setPeriodo] = useState<string>("mensal");

  const resetForm = () => {
    setNome("");
    setDescricao("");
    setTipoMeta("cadastros");
    setValorMeta("10");
    setPeriodo("mensal");
    setEditing(null);
    setCreating(false);
  };

  const handleEdit = (meta: MetaConfig) => {
    setEditing(meta);
    setNome(meta.nome);
    setDescricao(meta.descricao || "");
    setTipoMeta(meta.tipo_meta);
    setValorMeta(meta.valor_meta.toString());
    setPeriodo(meta.periodo);
    setCreating(false);
  };

  const handleCreate = () => {
    resetForm();
    setCreating(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ variant: "destructive", title: "Erro", description: "Nome é obrigatório" });
      return;
    }

    setSaving(true);

    if (editing) {
      const { error } = await updateMeta(editing.id, {
        nome,
        descricao: descricao || null,
        tipo_meta: tipoMeta as MetaConfig["tipo_meta"],
        valor_meta: parseInt(valorMeta) || 10,
        periodo: periodo as MetaConfig["periodo"],
      });

      if (error) {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar" });
      } else {
        toast({ title: "✓ Salvo", description: "Meta atualizada" });
        resetForm();
      }
    } else if (creating) {
      const { error } = await createMeta({
        nome,
        descricao: descricao || null,
        tipo_meta: tipoMeta as MetaConfig["tipo_meta"],
        valor_meta: parseInt(valorMeta) || 10,
        periodo: periodo as MetaConfig["periodo"],
      });

      if (error) {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível criar" });
      } else {
        toast({ title: "✓ Criada", description: "Nova meta adicionada" });
        resetForm();
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteMeta(id);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir" });
    } else {
      toast({ title: "Excluída", description: "Meta removida" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configurar Metas
          </DialogTitle>
        </DialogHeader>

        {/* Form for creating/editing */}
        {(creating || editing) && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium text-sm">{editing ? "Editar Meta" : "Nova Meta"}</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Nome</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Cadastros do mês"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipoMeta} onValueChange={setTipoMeta}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIODO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Meta (quantidade)</Label>
                <Input
                  type="number"
                  value={valorMeta}
                  onChange={(e) => setValorMeta(e.target.value)}
                  min="1"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Breve descrição"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        )}

        {/* List of metas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Metas Configuradas</h4>
            <Button size="sm" onClick={handleCreate} disabled={creating || !!editing}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Meta
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : metas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma meta configurada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metas.map((meta) => (
                  <TableRow key={meta.id}>
                    <TableCell className="font-medium">{meta.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{TIPO_LABELS[meta.tipo_meta]}</Badge>
                    </TableCell>
                    <TableCell>{meta.valor_meta}</TableCell>
                    <TableCell>{PERIODO_LABELS[meta.periodo]}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(meta)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => handleDelete(meta.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
