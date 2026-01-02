import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { Indicacao, StatusAbordagem, statusAbordagemLabels, ProximaAcao, proximaAcaoLabels, MotivoAbordagem, motivoAbordagemLabels, AcaoIndicacao } from "@/types/indicacao";
import { Loader2, Trash2, History, CalendarIcon, Plus, User } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface IndicacaoDialogProps {
  indicacao: Indicacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IndicacaoDialog({ indicacao, open, onOpenChange, onSuccess }: IndicacaoDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Indicacao>>({});
  const [acoes, setAcoes] = useState<(AcaoIndicacao & { user_name?: string })[]>([]);
  const [proximaAcaoDate, setProximaAcaoDate] = useState<Date | undefined>();
  const [proximaAcaoTime, setProximaAcaoTime] = useState("09:00");
  const [novaAcaoOpen, setNovaAcaoOpen] = useState(false);
  const [novaAcaoTipo, setNovaAcaoTipo] = useState<"primeiro_contato" | "follow_up">("primeiro_contato");
  const [novaAcaoObservacao, setNovaAcaoObservacao] = useState("");
  const [savingAcao, setSavingAcao] = useState(false);

  const fetchAcoes = async (indicacaoId: string) => {
    const { data } = await supabase
      .from("acoes_indicacao")
      .select("*")
      .eq("indicacao_id", indicacaoId)
      .order("created_at", { ascending: false });
    
    if (data) {
      // Fetch user names for each action
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
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && indicacao) {
      setFormData({
        nome_indicada: indicacao.nome_indicada,
        telefone_indicada: indicacao.telefone_indicada,
        nome_indicadora: indicacao.nome_indicadora,
        telefone_indicadora: indicacao.telefone_indicadora,
        status_abordagem: indicacao.status_abordagem,
        motivo_abordagem: indicacao.motivo_abordagem,
        observacoes: indicacao.observacoes,
        proxima_acao: indicacao.proxima_acao,
        proxima_acao_observacao: indicacao.proxima_acao_observacao,
      });
      if (indicacao.proxima_acao_data) {
        const date = parseISO(indicacao.proxima_acao_data);
        setProximaAcaoDate(date);
        setProximaAcaoTime(format(date, "HH:mm"));
      } else {
        setProximaAcaoDate(undefined);
        setProximaAcaoTime("09:00");
      }
      fetchAcoes(indicacao.id);
    } else {
      setAcoes([]);
      setProximaAcaoDate(undefined);
      setProximaAcaoTime("09:00");
    }
    onOpenChange(isOpen);
  };

  const registerAction = async (tipoAcao: string, observacao?: string) => {
    if (!indicacao || !user) return;
    await supabase.from("acoes_indicacao").insert({
      indicacao_id: indicacao.id,
      tipo_acao: tipoAcao,
      observacao: observacao || null,
      user_id: user.id,
    });
  };

  const handleRegistrarAcao = async () => {
    if (!indicacao || !user) return;
    setSavingAcao(true);
    
    const tipoLabel = novaAcaoTipo === "primeiro_contato" ? "1º Contato" : "Follow Up";
    
    const { error } = await supabase.from("acoes_indicacao").insert({
      indicacao_id: indicacao.id,
      tipo_acao: tipoLabel,
      observacao: novaAcaoObservacao || null,
      user_id: user.id,
    });

    if (error) {
      logError("registrar_acao", error);
      toast({
        variant: "destructive",
        title: "Erro ao registrar ação",
        description: getUserFriendlyError(error),
      });
    } else {
      toast({
        title: "Ação registrada",
        description: `${tipoLabel} registrado com sucesso.`,
      });
      setNovaAcaoObservacao("");
      setNovaAcaoOpen(false);
      fetchAcoes(indicacao.id);
    }
    setSavingAcao(false);
  };

  const handleSave = async () => {
    if (!indicacao) return;
    setLoading(true);

    // Build próxima ação datetime
    let proximaAcaoDatetime: string | null = null;
    if (proximaAcaoDate) {
      const [hours, minutes] = proximaAcaoTime.split(":").map(Number);
      const dateWithTime = new Date(proximaAcaoDate);
      dateWithTime.setHours(hours, minutes, 0, 0);
      proximaAcaoDatetime = dateWithTime.toISOString();
    }

    // Check what changed to register actions
    const changes: string[] = [];
    if (formData.status_abordagem !== indicacao.status_abordagem) {
      changes.push(`Status: ${statusAbordagemLabels[formData.status_abordagem as StatusAbordagem]}`);
    }
    if (formData.proxima_acao !== indicacao.proxima_acao && formData.proxima_acao) {
      changes.push(`Ação: ${proximaAcaoLabels[formData.proxima_acao as ProximaAcao]}`);
    }
    if (formData.motivo_abordagem !== indicacao.motivo_abordagem && formData.motivo_abordagem) {
      changes.push(`Motivo: ${motivoAbordagemLabels[formData.motivo_abordagem as MotivoAbordagem] || formData.motivo_abordagem}`);
    }

    const { error } = await supabase
      .from("indicacoes")
      .update({
        nome_indicada: formData.nome_indicada,
        telefone_indicada: formData.telefone_indicada,
        nome_indicadora: formData.nome_indicadora,
        telefone_indicadora: formData.telefone_indicadora,
        status_abordagem: formData.status_abordagem,
        motivo_abordagem: formData.motivo_abordagem,
        observacoes: formData.observacoes,
        proxima_acao: formData.proxima_acao,
        proxima_acao_data: proximaAcaoDatetime,
        proxima_acao_observacao: formData.proxima_acao_observacao,
      })
      .eq("id", indicacao.id);

    if (error) {
      logError("update_indicacao", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: getUserFriendlyError(error),
      });
    } else {
      // Register all changes as actions
      for (const change of changes) {
        await registerAction(change, formData.proxima_acao_observacao);
      }
      
      toast({
        title: "Indicação atualizada",
        description: "Os dados foram salvos com sucesso.",
      });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!indicacao) return;
    setLoading(true);

    const { error } = await supabase.from("indicacoes").delete().eq("id", indicacao.id);

    if (error) {
      logError("delete_indicacao", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: getUserFriendlyError(error),
      });
    } else {
      toast({
        title: "Indicação excluída",
        description: "O registro foi removido com sucesso.",
      });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  if (!indicacao) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Indicação</DialogTitle>
          <DialogDescription>Atualize os dados da indicação abaixo.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_indicada">Nome da Indicada</Label>
                <Input
                  id="nome_indicada"
                  value={formData.nome_indicada || ""}
                  onChange={(e) => setFormData({ ...formData, nome_indicada: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone_indicada">Telefone</Label>
                <Input
                  id="telefone_indicada"
                  value={formData.telefone_indicada || ""}
                  onChange={(e) => setFormData({ ...formData, telefone_indicada: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_indicadora">Nome da Indicadora</Label>
                <Input
                  id="nome_indicadora"
                  value={formData.nome_indicadora || ""}
                  onChange={(e) => setFormData({ ...formData, nome_indicadora: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone_indicadora">Tel. Indicadora</Label>
                <Input
                  id="telefone_indicadora"
                  value={formData.telefone_indicadora || ""}
                  onChange={(e) => setFormData({ ...formData, telefone_indicadora: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status da Abordagem</Label>
                <Select
                  value={formData.status_abordagem}
                  onValueChange={(value) => setFormData({ ...formData, status_abordagem: value as StatusAbordagem })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusAbordagemLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select
                  value={formData.motivo_abordagem || ""}
                  onValueChange={(value) => setFormData({ ...formData, motivo_abordagem: value as MotivoAbordagem })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(motivoAbordagemLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações Gerais</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes || ""}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
              />
            </div>

            {/* Próxima Ação Section */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <Label className="text-base font-semibold">Próxima Ação</Label>
              
              <div className="space-y-2">
                <Label>Tipo de Ação</Label>
                <Select
                  value={formData.proxima_acao || ""}
                  onValueChange={(value) => setFormData({ ...formData, proxima_acao: value as ProximaAcao })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a ação" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(proximaAcaoLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Agendada</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !proximaAcaoDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {proximaAcaoDate ? format(proximaAcaoDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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

                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={proximaAcaoTime}
                    onChange={(e) => setProximaAcaoTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observação da Ação</Label>
                <Textarea
                  value={formData.proxima_acao_observacao || ""}
                  onChange={(e) => setFormData({ ...formData, proxima_acao_observacao: e.target.value })}
                  rows={2}
                  placeholder="Descreva detalhes sobre esta ação..."
                />
              </div>
            </div>

            {/* Nova Ação - Popover */}
            <Popover open={novaAcaoOpen} onOpenChange={setNovaAcaoOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Registrar Nova Ação</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-popover border shadow-lg z-50" align="center">
                <div className="space-y-4">
                  <div className="font-medium text-sm">Nova Ação</div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de Ação</Label>
                    <Select
                      value={novaAcaoTipo}
                      onValueChange={(value) => setNovaAcaoTipo(value as "primeiro_contato" | "follow_up")}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[100]">
                        <SelectItem value="primeiro_contato">1º Contato</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Observações do Registro</Label>
                    <Textarea
                      value={novaAcaoObservacao}
                      onChange={(e) => setNovaAcaoObservacao(e.target.value)}
                      rows={3}
                      placeholder="Descreva o que foi discutido..."
                      className="text-sm"
                    />
                  </div>

                  <Button 
                    onClick={handleRegistrarAcao} 
                    disabled={savingAcao}
                    className="w-full"
                    size="sm"
                  >
                    {savingAcao && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Registrar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Histórico de Ações */}
            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Registro de Ações
              </Label>
              {acoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {acoes.map((acao) => (
                    <div key={acao.id} className="bg-muted/50 rounded-md px-3 py-2 border-l-2 border-primary/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-primary">{acao.tipo_acao}</span>
                        <span className="text-muted-foreground text-xs">
                          {format(parseISO(acao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        <span>{acao.user_name}</span>
                      </div>
                      {acao.observacao && (
                        <p className="text-xs text-foreground/80 mt-2 bg-background/50 p-2 rounded">{acao.observacao}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={loading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A indicação será permanentemente removida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}