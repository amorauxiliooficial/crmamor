import { useState, useEffect } from "react";
import { MaeProcesso, STATUS_COLORS } from "@/types/mae";
import { TipoAtividade, TIPO_ATIVIDADE_LABELS, RESULTADO_CONTATO_LABELS, ResultadoContato } from "@/types/atividade";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCpf, formatPhone } from "@/lib/formatters";
import { RegistrarAtividadeDialog } from "./RegistrarAtividadeDialog";
import { AgendarFollowUpDialog } from "./AgendarFollowUpDialog";
import {
  Phone,
  MessageCircle,
  FileText,
  StickyNote,
  Plus,
  CalendarPlus,
  History,
  Clock,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaeAtividadesDialogProps {
  mae: MaeProcesso | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onOpenEdit?: (mae: MaeProcesso) => void;
}

interface Atividade {
  id: string;
  tipo_atividade: TipoAtividade;
  descricao: string | null;
  data_atividade: string;
  resultado_contato: string | null;
  proxima_acao: string | null;
  data_proxima_acao: string | null;
  status_followup: string | null;
  concluido: boolean;
}

const TIPO_ICONS: Record<TipoAtividade, typeof Phone> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  documento: FileText,
  anotacao: StickyNote,
};

const TIPO_BG_COLORS: Record<TipoAtividade, string> = {
  ligacao: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  whatsapp: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  documento: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  anotacao: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
};

export function MaeAtividadesDialog({
  mae,
  open,
  onOpenChange,
  onRefresh,
  onOpenEdit,
}: MaeAtividadesDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [pendentes, setPendentes] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [novaAtividadeOpen, setNovaAtividadeOpen] = useState(false);
  const [agendarFollowUpOpen, setAgendarFollowUpOpen] = useState(false);

  // Fetch activities for this mae
  useEffect(() => {
    if (!mae || !open) return;

    const fetchAtividades = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("atividades_mae")
        .select("*")
        .eq("mae_id", mae.id)
        .order("data_atividade", { ascending: false });

      if (!error && data) {
        setAtividades(data as Atividade[]);
        setPendentes(
          data.filter(
            (a) => a.status_followup === "agendado" && !a.concluido
          ) as Atividade[]
        );
      }
      
      setLoading(false);
    };

    fetchAtividades();
  }, [mae, open]);

  const handleComplete = async (atividadeId: string) => {
    const { error } = await supabase
      .from("atividades_mae")
      .update({ concluido: true, concluido_em: new Date().toISOString(), status_followup: "concluido" })
      .eq("id", atividadeId);

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível completar." });
    } else {
      toast({ title: "✓ Concluído", description: "Follow-up marcado como concluído." });
      // Refresh activities
      const { data } = await supabase
        .from("atividades_mae")
        .select("*")
        .eq("mae_id", mae?.id)
        .order("data_atividade", { ascending: false });
      if (data) {
        setAtividades(data as Atividade[]);
        setPendentes(data.filter((a) => a.status_followup === "agendado" && !a.concluido) as Atividade[]);
      }
      onRefresh();
    }
  };

  const handleActivityAdded = () => {
    // Refresh activities list
    if (mae) {
      supabase
        .from("atividades_mae")
        .select("*")
        .eq("mae_id", mae.id)
        .order("data_atividade", { ascending: false })
        .then(({ data }) => {
          if (data) {
            setAtividades(data as Atividade[]);
            setPendentes(data.filter((a) => a.status_followup === "agendado" && !a.concluido) as Atividade[]);
          }
        });
    }
    onRefresh();
  };

  if (!mae) return null;

  const statusBg = STATUS_COLORS[mae.status_processo] || "bg-muted";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
          {/* Header with client info */}
          <DialogHeader className="p-4 pb-3 border-b">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg truncate">{mae.nome_mae}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span className="font-mono">{formatCpf(mae.cpf)}</span>
                  {mae.telefone && (
                    <>
                      <span>•</span>
                      <a
                        href={`https://wa.me/55${mae.telefone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-600 hover:underline"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {formatPhone(mae.telefone)}
                      </a>
                    </>
                  )}
                </div>
                <Badge variant="outline" className={`mt-2 text-xs ${statusBg}`}>
                  {mae.status_processo}
                </Badge>
              </div>
              {onOpenEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenEdit(mae);
                  }}
                  className="shrink-0"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Action buttons */}
          <div className="flex gap-2 p-4 border-b bg-muted/30">
            <Button onClick={() => setNovaAtividadeOpen(true)} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
            <Button variant="outline" onClick={() => setAgendarFollowUpOpen(true)} className="flex-1">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Agendar Follow-up
            </Button>
          </div>

          {/* Tabs for content */}
          <Tabs defaultValue="pendentes" className="flex-1">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
              <TabsTrigger
                value="pendentes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
              >
                <Clock className="h-4 w-4 mr-2" />
                Pendentes
                {pendentes.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {pendentes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
              >
                <History className="h-4 w-4 mr-2" />
                Histórico ({atividades.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[45vh]">
              {/* Pending follow-ups */}
              <TabsContent value="pendentes" className="m-0 p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendentes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum follow-up pendente</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setAgendarFollowUpOpen(true)}
                    >
                      <CalendarPlus className="h-4 w-4 mr-2" />
                      Agendar um
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendentes.map((atividade) => {
                      const Icon = atividade.proxima_acao
                        ? TIPO_ICONS[atividade.proxima_acao as TipoAtividade]
                        : Clock;
                      const isOverdue =
                        atividade.data_proxima_acao &&
                        isPast(parseISO(atividade.data_proxima_acao)) &&
                        !isToday(parseISO(atividade.data_proxima_acao));

                      return (
                        <Card
                          key={atividade.id}
                          className={`${isOverdue ? "border-l-4 border-l-destructive" : ""}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={`p-2 rounded-lg ${
                                  atividade.proxima_acao
                                    ? TIPO_BG_COLORS[atividade.proxima_acao as TipoAtividade]
                                    : "bg-muted"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {atividade.proxima_acao
                                      ? TIPO_ATIVIDADE_LABELS[atividade.proxima_acao as TipoAtividade]
                                      : "Follow-up"}
                                  </span>
                                  {isOverdue && (
                                    <Badge variant="destructive" className="text-[10px]">
                                      Atrasado
                                    </Badge>
                                  )}
                                </div>
                                {atividade.data_proxima_acao && (
                                  <p className={`text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                                    {format(parseISO(atividade.data_proxima_acao), "dd/MM/yyyy 'às' HH:mm", {
                                      locale: ptBR,
                                    })}
                                  </p>
                                )}
                                {atividade.descricao && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    {atividade.descricao}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleComplete(atividade.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Concluir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* History */}
              <TabsContent value="historico" className="m-0 p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : atividades.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma atividade registrada</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setNovaAtividadeOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Registrar primeira
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {atividades.map((atividade) => {
                      const Icon = TIPO_ICONS[atividade.tipo_atividade];
                      const bgColor = TIPO_BG_COLORS[atividade.tipo_atividade];

                      return (
                        <Card key={atividade.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${bgColor}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {TIPO_ATIVIDADE_LABELS[atividade.tipo_atividade]}
                                  </span>
                                  {atividade.resultado_contato && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {RESULTADO_CONTATO_LABELS[atividade.resultado_contato as ResultadoContato]}
                                    </Badge>
                                  )}
                                  {atividade.concluido && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Concluído
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(parseISO(atividade.data_atividade), "dd/MM/yyyy 'às' HH:mm", {
                                    locale: ptBR,
                                  })}
                                  <span className="mx-1">•</span>
                                  {formatDistanceToNow(parseISO(atividade.data_atividade), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </p>
                                {atividade.descricao && (
                                  <p className="text-sm mt-2 p-2 bg-muted/50 rounded-md">
                                    {atividade.descricao}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      {mae && (
        <>
          <RegistrarAtividadeDialog
            mae={mae}
            open={novaAtividadeOpen}
            onOpenChange={setNovaAtividadeOpen}
            onActivityAdded={handleActivityAdded}
          />
          <AgendarFollowUpDialog
            mae={mae}
            open={agendarFollowUpOpen}
            onOpenChange={setAgendarFollowUpOpen}
            onFollowUpAgendado={handleActivityAdded}
          />
        </>
      )}
    </>
  );
}
