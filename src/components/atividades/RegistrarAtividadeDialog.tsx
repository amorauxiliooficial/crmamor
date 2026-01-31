import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  MessageCircle, 
  FileText, 
  StickyNote, 
  Video,
  Loader2,
  CalendarClock,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfigPrazos } from "@/hooks/useAtividades";
import { 
  TipoAtividade, 
  ResultadoContato, 
  TIPO_ATIVIDADE_LABELS, 
  RESULTADO_CONTATO_LABELS 
} from "@/types/atividade";
import { MaeProcesso } from "@/types/mae";
import { addDays, format, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RegistrarAtividadeDialogProps {
  mae: MaeProcesso;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivityAdded?: () => void;
  preSelectedTipo?: TipoAtividade;
}

const TIPO_ICONS: Record<TipoAtividade, typeof Phone> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  documento: FileText,
  anotacao: StickyNote,
  reuniao: Video,
};

const TIPO_COLORS: Record<TipoAtividade, string> = {
  ligacao: "bg-blue-500 hover:bg-blue-600 text-white",
  whatsapp: "bg-emerald-500 hover:bg-emerald-600 text-white",
  documento: "bg-purple-500 hover:bg-purple-600 text-white",
  anotacao: "bg-amber-500 hover:bg-amber-600 text-white",
  reuniao: "bg-rose-500 hover:bg-rose-600 text-white",
};

const RESULTADO_COLORS: Record<ResultadoContato, string> = {
  conseguiu_falar: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
  nao_atendeu: "border-red-500 bg-red-50 dark:bg-red-900/20",
  ocupado: "border-amber-500 bg-amber-50 dark:bg-amber-900/20",
  deixou_recado: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
  avancou: "border-primary bg-primary/10",
  aguardando: "border-slate-400 bg-slate-50 dark:bg-slate-900/20",
  pendencia: "border-orange-500 bg-orange-50 dark:bg-orange-900/20",
  finalizado: "border-green-600 bg-green-50 dark:bg-green-900/20",
};

export function RegistrarAtividadeDialog({ 
  mae, 
  open, 
  onOpenChange,
  onActivityAdded,
  preSelectedTipo
}: RegistrarAtividadeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getPrazoForStatus } = useConfigPrazos();
  
  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Form state
  const [tipoAtividade, setTipoAtividade] = useState<TipoAtividade | null>(preSelectedTipo || null);
  const [descricao, setDescricao] = useState("");
  const [resultadoContato, setResultadoContato] = useState<ResultadoContato | null>(null);
  
  // Follow-up scheduling
  const [agendarProximo, setAgendarProximo] = useState(true);
  const [proximaAcao, setProximaAcao] = useState<TipoAtividade>("ligacao");
  const [dataProximaAcao, setDataProximaAcao] = useState("");
  const [horaProximaAcao, setHoraProximaAcao] = useState("09:00");
  
  const [saving, setSaving] = useState(false);

  // Calculate suggested next date based on status
  useEffect(() => {
    if (open) {
      const prazo = getPrazoForStatus(mae.status_processo);
      const suggestedDate = addDays(new Date(), prazo);
      setDataProximaAcao(format(suggestedDate, "yyyy-MM-dd"));
    }
  }, [open, mae.status_processo, getPrazoForStatus]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setTipoAtividade(preSelectedTipo || null);
      setDescricao("");
      setResultadoContato(null);
      setAgendarProximo(true);
      setProximaAcao("ligacao");
      setHoraProximaAcao("09:00");
    }
  }, [open, preSelectedTipo]);

  const handleSelectTipo = (tipo: TipoAtividade) => {
    setTipoAtividade(tipo);
    setStep(2);
  };

  const handleSelectResultado = (resultado: ResultadoContato) => {
    setResultadoContato(resultado);
    // Auto-advance to step 3 if not finalized
    if (resultado !== "finalizado") {
      setStep(3);
    }
  };

  const handleSave = async () => {
    if (!user || !tipoAtividade || !resultadoContato) return;

    setSaving(true);

    // Build next action date with time
    let dataProximaAcaoFinal: string | null = null;
    if (agendarProximo && resultadoContato !== "finalizado" && dataProximaAcao) {
      const [hours, minutes] = horaProximaAcao.split(":").map(Number);
      const date = new Date(dataProximaAcao);
      const dateWithTime = setMinutes(setHours(date, hours), minutes);
      dataProximaAcaoFinal = dateWithTime.toISOString();
    }

    const { error } = await supabase.from("atividades_mae").insert({
      mae_id: mae.id,
      user_id: user.id,
      tipo_atividade: tipoAtividade,
      descricao: descricao || null,
      resultado_contato: resultadoContato,
      proxima_acao: agendarProximo && resultadoContato !== "finalizado" ? proximaAcao : null,
      data_proxima_acao: dataProximaAcaoFinal,
      status_followup: agendarProximo && resultadoContato !== "finalizado" ? "agendado" : "concluido",
      concluido: resultadoContato === "finalizado",
      concluido_em: resultadoContato === "finalizado" ? new Date().toISOString() : null,
    });

    setSaving(false);

    if (error) {
      console.error("Erro ao registrar atividade:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar a atividade.",
      });
    } else {
      toast({
        title: "✓ Atividade registrada",
        description: agendarProximo && resultadoContato !== "finalizado"
          ? `Próximo follow-up agendado para ${format(new Date(dataProximaAcaoFinal!), "dd/MM 'às' HH:mm", { locale: ptBR })}`
          : "Atividade salva com sucesso!",
      });
      onActivityAdded?.();
      onOpenChange(false);
    }
  };

  const canProceedToStep3 = tipoAtividade && resultadoContato && resultadoContato !== "finalizado";
  const canSave = tipoAtividade && resultadoContato && (
    resultadoContato === "finalizado" || 
    !agendarProximo || 
    (agendarProximo && dataProximaAcao)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Registrar Atividade
          </DialogTitle>
          <DialogDescription>
            {mae.nome_mae.split(" ").slice(0, 2).join(" ")}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  step >= s 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Activity Type */}
        {step === 1 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">O que você fez?</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TIPO_ICONS) as TipoAtividade[]).map((tipo) => {
                const Icon = TIPO_ICONS[tipo];
                return (
                  <Button
                    key={tipo}
                    variant="outline"
                    className={`h-16 flex-col gap-1.5 ${tipoAtividade === tipo ? "ring-2 ring-primary" : ""}`}
                    onClick={() => handleSelectTipo(tipo)}
                  >
                    <div className={`p-1.5 rounded-full ${TIPO_COLORS[tipo]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs">{TIPO_ATIVIDADE_LABELS[tipo]}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Result + Description */}
        {step === 2 && tipoAtividade && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                ← Voltar
              </Button>
              <Badge className={TIPO_COLORS[tipoAtividade]}>
                {TIPO_ATIVIDADE_LABELS[tipoAtividade]}
              </Badge>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Qual foi o resultado?</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(RESULTADO_CONTATO_LABELS) as ResultadoContato[]).map((resultado) => (
                  <Button
                    key={resultado}
                    variant="outline"
                    size="sm"
                    className={`h-auto py-2 px-3 text-left justify-start ${
                      resultadoContato === resultado 
                        ? `ring-2 ring-primary ${RESULTADO_COLORS[resultado]}` 
                        : ""
                    }`}
                    onClick={() => handleSelectResultado(resultado)}
                  >
                    <span className="text-xs">{RESULTADO_CONTATO_LABELS[resultado]}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Observação (opcional)</Label>
              <Textarea
                placeholder="Descreva o que conversou, pendências identificadas..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
              />
            </div>

            {resultadoContato === "finalizado" && (
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Finalizar Acompanhamento
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Schedule Next Follow-up */}
        {step === 3 && canProceedToStep3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                ← Voltar
              </Button>
              <Badge variant="outline">{RESULTADO_CONTATO_LABELS[resultadoContato!]}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <div>
                <Label className="text-sm font-medium">Agendar próximo follow-up</Label>
                <p className="text-xs text-muted-foreground">
                  Sistema sugere baseado no prazo do status atual
                </p>
              </div>
              <Switch 
                checked={agendarProximo} 
                onCheckedChange={setAgendarProximo}
              />
            </div>

            {agendarProximo && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo de ação</Label>
                  <div className="flex flex-wrap gap-2">
                    {(["ligacao", "whatsapp", "documento", "reuniao"] as TipoAtividade[]).map((tipo) => {
                      const Icon = TIPO_ICONS[tipo];
                      return (
                        <Button
                          key={tipo}
                          variant={proximaAcao === tipo ? "default" : "outline"}
                          size="sm"
                          onClick={() => setProximaAcao(tipo)}
                          className="gap-1.5"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {TIPO_ATIVIDADE_LABELS[tipo]}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Data</Label>
                    <Input
                      type="date"
                      value={dataProximaAcao}
                      onChange={(e) => setDataProximaAcao(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Horário</Label>
                    <Input
                      type="time"
                      value={horaProximaAcao}
                      onChange={(e) => setHoraProximaAcao(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <Button 
              onClick={handleSave} 
              disabled={saving || !canSave}
              className="w-full"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {agendarProximo ? "Salvar e Agendar" : "Salvar Atividade"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
