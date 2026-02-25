import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import {
  Indicacao,
  StatusAbordagem,
  statusAbordagemLabels,
  statusAbordagemColors,
  MotivoAbordagem,
  motivoAbordagemLabels,
  AcaoIndicacao,
  origemIndicacaoLabels,
  OrigemIndicacao,
} from "@/types/indicacao";
import {
  MessageSquare,
  Phone,
  UserPlus,
  CalendarPlus,
  Loader2,
  Trash2,
  History,
  User,
  Save,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface IndicacaoDetailPanelProps {
  indicacao: Indicacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IndicacaoDetailPanel({ indicacao, open, onOpenChange, onSuccess }: IndicacaoDetailPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Indicacao>>({});
  const [acoes, setAcoes] = useState<(AcaoIndicacao & { user_name?: string })[]>([]);
  const [loadingAcoes, setLoadingAcoes] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [converting, setConverting] = useState(false);

  const fetchAcoes = async (indicacaoId: string) => {
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
          return { ...acao, user_name: profile?.full_name || "Usuário" };
        })
      );
      setAcoes(acoesWithUserName as (AcaoIndicacao & { user_name?: string })[]);
    }
    setLoadingAcoes(false);
  };

  useEffect(() => {
    if (open && indicacao) {
      setFormData({
        nome_indicada: indicacao.nome_indicada,
        telefone_indicada: indicacao.telefone_indicada,
        nome_indicadora: indicacao.nome_indicadora,
        telefone_indicadora: indicacao.telefone_indicadora,
        status_abordagem: indicacao.status_abordagem,
        motivo_abordagem: indicacao.motivo_abordagem,
        observacoes: indicacao.observacoes,
      });
      fetchAcoes(indicacao.id);
    } else {
      setAcoes([]);
    }
  }, [open, indicacao?.id]);

  const sanitizePhone = (phone: string | undefined | null): string => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const handleWhatsApp = () => {
    const phone = sanitizePhone(indicacao?.telefone_indicada);
    if (phone) {
      window.open(`https://wa.me/${phone}`, "_blank");
    } else {
      toast({ variant: "destructive", title: "Sem telefone", description: "Esta indicação não possui telefone cadastrado." });
    }
  };

  const handleCall = () => {
    const phone = sanitizePhone(indicacao?.telefone_indicada);
    if (phone) {
      window.open(`tel:+${phone}`, "_self");
    } else {
      toast({ variant: "destructive", title: "Sem telefone", description: "Esta indicação não possui telefone cadastrado." });
    }
  };

  const handleCopyPhone = async () => {
    const phone = indicacao?.telefone_indicada;
    if (phone) {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
      toast({ title: "Copiado!", description: "Telefone copiado para a área de transferência." });
    }
  };

  const handleConvertToMae = async () => {
    if (!user || !indicacao) return;
    setConverting(true);

    const { data: newMae, error } = await supabase
      .from("mae_processo")
      .insert({
        nome_mae: indicacao.nome_indicada,
        telefone: indicacao.telefone_indicada || null,
        cpf: "",
        user_id: user.id,
        origem: `Indicação${indicacao.nome_indicadora ? ` de ${indicacao.nome_indicadora}` : ""}`,
      })
      .select()
      .single();

    if (error) {
      logError("convert_indicacao_to_mae", error);
      toast({ variant: "destructive", title: "Erro ao converter", description: getUserFriendlyError(error) });
    } else if (newMae) {
      // Update indicacao status
      await supabase
        .from("indicacoes")
        .update({ status_abordagem: "concluido", motivo_abordagem: "fechou_contrato" })
        .eq("id", indicacao.id);

      // Register action
      await supabase.from("acoes_indicacao").insert({
        indicacao_id: indicacao.id,
        tipo_acao: "Convertida em Mãe/Processo",
        observacao: `Processo criado: ${newMae.id}`,
        user_id: user.id,
      });

      toast({ title: "Convertida!", description: `${indicacao.nome_indicada} foi convertida em processo.` });
      onSuccess();
      onOpenChange(false);
      // Navigate to the main view so user can find the new record
      navigate("/?view=kanban");
    }
    setConverting(false);
  };

  const handleCreateActivity = async () => {
    if (!user || !indicacao) return;

    // Register a follow-up action
    await supabase.from("acoes_indicacao").insert({
      indicacao_id: indicacao.id,
      tipo_acao: "Follow Up agendado",
      observacao: `Atividade de follow-up criada para ${indicacao.nome_indicada}`,
      user_id: user.id,
    });

    // Update indicacao to em_andamento if pendente
    if (indicacao.status_abordagem === "pendente" || indicacao.status_abordagem === "aguardando_aprovacao") {
      await supabase
        .from("indicacoes")
        .update({ status_abordagem: "em_andamento" })
        .eq("id", indicacao.id);
    }

    toast({ title: "Atividade criada", description: "Follow-up registrado com sucesso." });
    onSuccess();
    fetchAcoes(indicacao.id);
  };

  const handleSave = async () => {
    if (!indicacao) return;
    setLoading(true);

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
      })
      .eq("id", indicacao.id);

    if (error) {
      logError("update_indicacao", error);
      toast({ variant: "destructive", title: "Erro ao atualizar", description: getUserFriendlyError(error) });
    } else {
      toast({ title: "Indicação atualizada", description: "Os dados foram salvos com sucesso." });
      onSuccess();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!indicacao) return;
    setLoading(true);

    const { error } = await supabase.from("indicacoes").delete().eq("id", indicacao.id);

    if (error) {
      logError("delete_indicacao", error);
      toast({ variant: "destructive", title: "Erro ao excluir", description: getUserFriendlyError(error) });
    } else {
      toast({ title: "Indicação excluída", description: "O registro foi removido com sucesso." });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  if (!indicacao) return null;

  const origem = (indicacao.origem_indicacao || "interna") as OrigemIndicacao;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{indicacao.nome_indicada}</SheetTitle>
            <Badge variant="secondary" className={`text-xs ${statusAbordagemColors[indicacao.status_abordagem]}`}>
              {statusAbordagemLabels[indicacao.status_abordagem]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{format(parseISO(indicacao.data_indicacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            <span>·</span>
            <Badge variant="outline" className="text-[10px]">
              {origem === "externa" && <ExternalLink className="h-3 w-3 mr-1" />}
              {origemIndicacaoLabels[origem]}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Quick Actions */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações Rápidas</Label>
              <div className="grid grid-cols-2 gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={handleWhatsApp}>
                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                        WhatsApp
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Abrir conversa no WhatsApp</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={handleCall}>
                        <Phone className="h-4 w-4 text-blue-600" />
                        Ligar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ligar para o telefone</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 justify-start"
                        onClick={handleConvertToMae}
                        disabled={converting || indicacao.status_abordagem === "concluido"}
                      >
                        {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 text-primary" />}
                        Converter
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Criar processo/mãe a partir desta indicação</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={handleCreateActivity}>
                        <CalendarPlus className="h-4 w-4 text-amber-600" />
                        Follow-up
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Criar atividade de follow-up</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <Separator />

            {/* Edit Form */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados da Indicação</Label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome da Indicada</Label>
                  <Input
                    value={formData.nome_indicada || ""}
                    onChange={(e) => setFormData({ ...formData, nome_indicada: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefone</Label>
                  <div className="flex gap-1">
                    <Input
                      value={formData.telefone_indicada || ""}
                      onChange={(e) => setFormData({ ...formData, telefone_indicada: e.target.value })}
                      className="h-9 text-sm flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={handleCopyPhone}>
                      {copiedPhone ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Indicadora</Label>
                  <Input
                    value={formData.nome_indicadora || ""}
                    onChange={(e) => setFormData({ ...formData, nome_indicadora: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tel. Indicadora</Label>
                  <Input
                    value={formData.telefone_indicadora || ""}
                    onChange={(e) => setFormData({ ...formData, telefone_indicadora: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={formData.status_abordagem}
                    onValueChange={(value) => setFormData({ ...formData, status_abordagem: value as StatusAbordagem })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      {Object.entries(statusAbordagemLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Motivo</Label>
                  <Select
                    value={formData.motivo_abordagem || "__none__"}
                    onValueChange={(value) => setFormData({ ...formData, motivo_abordagem: value === "__none__" ? undefined : value as MotivoAbordagem })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {Object.entries(motivoAbordagemLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  value={formData.observacoes || ""}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Action History */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <History className="h-3 w-3" />
                Registro de Ações
              </Label>
              {loadingAcoes ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : acoes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nenhuma ação registrada.</p>
              ) : (
                <div className="space-y-2">
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

        {/* Footer Actions */}
        <div className="border-t p-4 flex items-center justify-between gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={loading}>
                <Trash2 className="h-4 w-4" />
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

          <Button onClick={handleSave} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
