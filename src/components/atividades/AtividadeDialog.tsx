import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  MessageCircle, 
  FileText, 
  StickyNote, 
  Video,
  Loader2,
  Plus,
  Clock
} from "lucide-react";
import { useAtividades } from "@/hooks/useAtividades";
import { TipoAtividade, TIPO_ATIVIDADE_LABELS } from "@/types/atividade";
import { MaeProcesso } from "@/types/mae";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AtividadeDialogProps {
  mae: MaeProcesso;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivityAdded?: () => void;
}

const TIPO_ICONS: Record<TipoAtividade, typeof Phone> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  documento: FileText,
  anotacao: StickyNote,
  reuniao: Video,
};

const TIPO_COLORS: Record<TipoAtividade, string> = {
  ligacao: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  whatsapp: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  documento: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  anotacao: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  reuniao: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export function AtividadeDialog({ 
  mae, 
  open, 
  onOpenChange,
  onActivityAdded 
}: AtividadeDialogProps) {
  const { atividades, loading, addAtividade } = useAtividades(mae.id);
  const [selectedTipo, setSelectedTipo] = useState<TipoAtividade | null>(null);
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddAtividade = async () => {
    if (!selectedTipo) return;
    
    setSaving(true);
    const result = await addAtividade(mae.id, selectedTipo, descricao);
    setSaving(false);

    if (result.success) {
      setSelectedTipo(null);
      setDescricao("");
      onActivityAdded?.();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatRelative = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Atividades - {mae.nome_mae}
          </DialogTitle>
          <DialogDescription>
            Registre ligações, mensagens e acompanhe o histórico de interações.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Add Section */}
        <div className="space-y-3 py-3 border-b">
          <Label className="text-sm font-medium">Registrar nova atividade</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TIPO_ICONS) as TipoAtividade[])
              .filter((tipo) => tipo !== "ligacao")
              .map((tipo) => {
              const Icon = TIPO_ICONS[tipo];
              const isSelected = selectedTipo === tipo;
              return (
                <Button
                  key={tipo}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTipo(isSelected ? null : tipo)}
                  className="gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {TIPO_ATIVIDADE_LABELS[tipo]}
                </Button>
              );
            })}
          </div>

          {selectedTipo && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Textarea
                placeholder="Descreva a atividade (opcional)..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
              />
              <Button 
                onClick={handleAddAtividade} 
                disabled={saving}
                size="sm"
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Registrar {TIPO_ATIVIDADE_LABELS[selectedTipo]}
              </Button>
            </div>
          )}
        </div>

        {/* Activity History */}
        <div className="flex-1 overflow-hidden">
          <Label className="text-sm font-medium text-muted-foreground">
            Histórico ({atividades.length})
          </Label>
          
          <ScrollArea className="h-[250px] mt-2 pr-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : atividades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma atividade registrada ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {atividades.map((atividade, index) => {
                  const Icon = TIPO_ICONS[atividade.tipo_atividade];
                  return (
                    <div key={atividade.id}>
                      <div className="flex items-start gap-3">
                        <Badge 
                          variant="outline" 
                          className={`p-1.5 ${TIPO_COLORS[atividade.tipo_atividade]}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {TIPO_ATIVIDADE_LABELS[atividade.tipo_atividade]}
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {formatRelative(atividade.data_atividade)}
                            </span>
                          </div>
                          {atividade.descricao && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {atividade.descricao}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDate(atividade.data_atividade)}
                          </p>
                        </div>
                      </div>
                      {index < atividades.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
