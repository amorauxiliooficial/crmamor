import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { ProximaAcao, proximaAcaoLabels, AcaoIndicacao } from "@/types/indicacao";
import { Loader2, CalendarIcon, History, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AcaoPopoverProps {
  indicacaoId: string;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function AcaoPopover({ indicacaoId, onSuccess, trigger }: AcaoPopoverProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acaoTipo, setAcaoTipo] = useState<"primeiro_contato" | "follow_up">("primeiro_contato");
  const [acaoObservacao, setAcaoObservacao] = useState("");
  const [proximaAcao, setProximaAcao] = useState<ProximaAcao | "">("");
  const [proximaAcaoDate, setProximaAcaoDate] = useState<Date | undefined>();
  const [proximaAcaoTime, setProximaAcaoTime] = useState("09:00");
  const [proximaAcaoObservacao, setProximaAcaoObservacao] = useState("");
  const [savingProximaAcao, setSavingProximaAcao] = useState(false);
  const [acoes, setAcoes] = useState<(AcaoIndicacao & { user_name?: string })[]>([]);
  const [loadingAcoes, setLoadingAcoes] = useState(false);

  const fetchAcoes = async () => {
    setLoadingAcoes(true);
    const { data } = await supabase
      .from("acoes_indicacao")
      .select("*")
      .eq("indicacao_id", indicacaoId)
      .order("created_at", { ascending: false });
    
    if (data) {
      const acoesWithUserName = await Promise.all(
        data.map(async (acao) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", acao.user_id)
            .maybeSingle();
          return {
            ...acao,
            user_name: profile?.full_name || "Usuário",
          };
        })
      );
      setAcoes(acoesWithUserName as (AcaoIndicacao & { user_name?: string })[]);
    }
    setLoadingAcoes(false);
  };

  useEffect(() => {
    if (open) {
      fetchAcoes();
    }
  }, [open, indicacaoId]);

  const handleRegistrar = async () => {
    if (!user) return;
    setSaving(true);

    const tipoLabel = acaoTipo === "primeiro_contato" ? "1º Contato" : "Follow Up";

    const { error: acaoError } = await supabase.from("acoes_indicacao").insert({
      indicacao_id: indicacaoId,
      tipo_acao: tipoLabel,
      observacao: acaoObservacao || null,
      user_id: user.id,
    });

    if (acaoError) {
      logError("registrar_acao", acaoError);
      toast({
        variant: "destructive",
        title: "Erro ao registrar ação",
        description: getUserFriendlyError(acaoError),
      });
      setSaving(false);
      return;
    }

    let proximaAcaoDatetime: string | null = null;
    if (proximaAcaoDate) {
      const [hours, minutes] = proximaAcaoTime.split(":").map(Number);
      const dateWithTime = new Date(proximaAcaoDate);
      dateWithTime.setHours(hours, minutes, 0, 0);
      proximaAcaoDatetime = dateWithTime.toISOString();
    }

    const { error: updateError } = await supabase
      .from("indicacoes")
      .update({
        proxima_acao: proximaAcao || null,
        proxima_acao_data: proximaAcaoDatetime,
        proxima_acao_observacao: proximaAcaoObservacao || null,
        status_abordagem: "em_andamento",
      })
      .eq("id", indicacaoId);

    if (updateError) {
      logError("update_proxima_acao", updateError);
    }

    toast({
      title: "Ação registrada",
      description: `${tipoLabel} registrado com sucesso.`,
    });

    setAcaoObservacao("");
    setProximaAcao("");
    setProximaAcaoDate(undefined);
    setProximaAcaoTime("09:00");
    setProximaAcaoObservacao("");
    fetchAcoes();
    onSuccess();
    setSaving(false);
  };

  const handleSalvarProximaAcao = async () => {
    if (!user) return;
    if (!proximaAcao || !proximaAcaoDate) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Selecione o tipo e a data da próxima ação.",
      });
      return;
    }

    setSavingProximaAcao(true);

    const [hours, minutes] = proximaAcaoTime.split(":").map(Number);
    const dateWithTime = new Date(proximaAcaoDate);
    dateWithTime.setHours(hours, minutes, 0, 0);
    const proximaAcaoDatetime = dateWithTime.toISOString();

    const { error: updateError } = await supabase
      .from("indicacoes")
      .update({
        proxima_acao: proximaAcao,
        proxima_acao_data: proximaAcaoDatetime,
        proxima_acao_observacao: proximaAcaoObservacao || null,
      })
      .eq("id", indicacaoId);

    if (updateError) {
      logError("salvar_proxima_acao", updateError);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: getUserFriendlyError(updateError),
      });
      setSavingProximaAcao(false);
      return;
    }

    toast({
      title: "Próxima ação salva",
      description: "O agendamento foi salvo com sucesso.",
    });

    setProximaAcao("");
    setProximaAcaoDate(undefined);
    setProximaAcaoTime("09:00");
    setProximaAcaoObservacao("");
    onSuccess();
    setSavingProximaAcao(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
          >
            Ação
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[420px] bg-popover border shadow-lg z-[9999]" 
        align="end" 
        sideOffset={5}
        onClick={(e) => e.stopPropagation()}
      >
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4 p-1">
            <div className="font-medium text-sm border-b pb-2">Registrar Ação</div>

            {/* Tipo de Ação */}
            <div className="space-y-2">
              <Label className="text-xs">Tipo de Ação</Label>
              <Select
                value={acaoTipo}
                onValueChange={(value) => setAcaoTipo(value as "primeiro_contato" | "follow_up")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[10000]">
                  <SelectItem value="primeiro_contato">1º Contato</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observações do Registro */}
            <div className="space-y-2">
              <Label className="text-xs">Observações do Registro</Label>
              <Textarea
                value={acaoObservacao}
                onChange={(e) => setAcaoObservacao(e.target.value)}
                rows={2}
                placeholder="Descreva o que foi discutido..."
                className="text-sm"
              />
            </div>

            <Button
              onClick={handleRegistrar}
              disabled={saving}
              className="w-full"
              size="sm"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar Ação
            </Button>

            {/* Próxima Ação */}
            <div className="border-t pt-4 space-y-3">
              <Label className="text-xs font-semibold">Projetar Próxima Ação</Label>

              <div className="space-y-2">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={proximaAcao}
                  onValueChange={(value) => setProximaAcao(value as ProximaAcao)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[10000]">
                    {Object.entries(proximaAcaoLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full h-9 justify-start text-left font-normal text-xs",
                          !proximaAcaoDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {proximaAcaoDate ? format(proximaAcaoDate, "dd/MM/yy", { locale: ptBR }) : "Data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[10000]" align="start">
                      <Calendar
                        mode="single"
                        selected={proximaAcaoDate}
                        onSelect={setProximaAcaoDate}
                        initialFocus
                        locale={ptBR}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Horário</Label>
                  <Input
                    type="time"
                    value={proximaAcaoTime}
                    onChange={(e) => setProximaAcaoTime(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Observação</Label>
                <Textarea
                  value={proximaAcaoObservacao}
                  onChange={(e) => setProximaAcaoObservacao(e.target.value)}
                  rows={2}
                  placeholder="Detalhes da próxima ação..."
                  className="text-sm"
                />
              </div>

              <Button
                onClick={handleSalvarProximaAcao}
                disabled={savingProximaAcao || !proximaAcao || !proximaAcaoDate}
                variant="secondary"
                className="w-full"
                size="sm"
              >
                {savingProximaAcao && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Próxima Ação
              </Button>
            </div>

            {/* Histórico de Ações */}
            <div className="border-t pt-4 space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold">
                <History className="h-4 w-4" />
                Registro de Ações
              </Label>
              {loadingAcoes ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : acoes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nenhuma ação registrada.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {acoes.map((acao) => (
                    <div key={acao.id} className="bg-muted/50 rounded-md px-3 py-2 border-l-2 border-primary/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-primary">{acao.tipo_acao}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {format(parseISO(acao.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        <span>{acao.user_name}</span>
                      </div>
                      {acao.observacao && (
                        <p className="text-[11px] text-foreground/80 mt-1 bg-background/50 p-1.5 rounded">{acao.observacao}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
