import { useState, useEffect } from "react";
import { MaeProcesso } from "@/types/mae";
import { Atividade, TipoAtividade, TIPO_ATIVIDADE_LABELS, RESULTADO_CONTATO_LABELS, ResultadoContato } from "@/types/atividade";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  Phone, 
  MessageCircle, 
  FileText, 
  StickyNote,
  Video,
  Loader2,
  CheckCircle2,
  Clock,
  X
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoAtividadesDialogProps {
  mae: MaeProcesso;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPO_ICONS: Record<TipoAtividade, typeof Phone> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  documento: FileText,
  anotacao: StickyNote,
  reuniao: Video,
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  concluido: CheckCircle2,
  agendado: Clock,
  cancelado: X,
  pendente: Clock,
};

export function HistoricoAtividadesDialog({
  mae,
  open,
  onOpenChange,
}: HistoricoAtividadesDialogProps) {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAtividades();
    }
  }, [open, mae.id]);

  const fetchAtividades = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("atividades_mae")
      .select("*")
      .eq("mae_id", mae.id)
      .order("data_atividade", { ascending: false });

    if (!error && data) {
      setAtividades(data as Atividade[]);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Atividades
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{mae.nome_mae}</p>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : atividades.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma atividade registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {atividades.map((atividade) => {
                const Icon = TIPO_ICONS[atividade.tipo_atividade as TipoAtividade] || StickyNote;
                const StatusIcon = STATUS_ICONS[atividade.status_followup || "pendente"] || Clock;
                
                return (
                  <div 
                    key={atividade.id} 
                    className="p-3 border rounded-lg bg-card"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {TIPO_ATIVIDADE_LABELS[atividade.tipo_atividade as TipoAtividade] || atividade.tipo_atividade}
                          </span>
                          {atividade.resultado_contato && (
                            <Badge variant="outline" className="text-[10px]">
                              {RESULTADO_CONTATO_LABELS[atividade.resultado_contato as ResultadoContato] || atividade.resultado_contato}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(atividade.data_atividade), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        
                        {atividade.descricao && (
                          <p className="text-sm mt-2 text-muted-foreground">
                            {atividade.descricao}
                          </p>
                        )}
                        
                        {/* Follow-up Info */}
                        {atividade.data_proxima_acao && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs flex items-center gap-2">
                            <StatusIcon className="h-3.5 w-3.5" />
                            <span>
                              Follow-up: {format(parseISO(atividade.data_proxima_acao), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </span>
                            <Badge 
                              variant={atividade.status_followup === "concluido" ? "default" : 
                                       atividade.status_followup === "cancelado" ? "destructive" : "secondary"}
                              className="text-[10px]"
                            >
                              {atividade.status_followup === "concluido" ? "Concluído" :
                               atividade.status_followup === "cancelado" ? "Cancelado" :
                               atividade.status_followup === "agendado" ? "Agendado" : "Pendente"}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
