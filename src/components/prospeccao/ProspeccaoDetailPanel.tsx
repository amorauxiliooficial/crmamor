import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { normalizePhoneToE164BR } from "@/lib/phoneUtils";
import { Prospeccao, StatusProspeccao, statusProspeccaoLabels, statusProspeccaoColors } from "@/types/prospeccao";
import { MessageSquare, Phone, Loader2, Save, UserPlus, CalendarIcon, Trash2, Baby, MapPin, Clock, ExternalLink, Copy, Check } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ProspeccaoDetailPanelProps {
  prospeccao: Prospeccao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProspeccaoDetailPanel({ prospeccao, open, onOpenChange, onSuccess }: ProspeccaoDetailPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [formData, setFormData] = useState<Partial<Prospeccao>>({});
  const [proximaAcaoDate, setProximaAcaoDate] = useState<Date | undefined>();
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    if (open && prospeccao) {
      setFormData({
        nome: prospeccao.nome,
        telefone: prospeccao.telefone,
        mes_gestacao: prospeccao.mes_gestacao,
        status: prospeccao.status,
        observacoes: prospeccao.observacoes,
        proxima_acao: prospeccao.proxima_acao,
        origem: prospeccao.origem,
      });
      setProximaAcaoDate(prospeccao.proxima_acao_data ? parseISO(prospeccao.proxima_acao_data) : undefined);
      setCopiedPhone(false);
    }
  }, [open, prospeccao?.id]);

  const sanitizePhone = (phone: string | undefined | null): string => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const handleWhatsApp = () => {
    const phone = sanitizePhone(prospeccao?.telefone_e164 || prospeccao?.telefone);
    if (phone) window.open(`https://wa.me/${phone}`, "_blank");
  };

  const handleCall = () => {
    const phone = sanitizePhone(prospeccao?.telefone_e164 || prospeccao?.telefone);
    if (phone) window.open(`tel:+${phone}`, "_self");
  };

  const handleCopyPhone = async () => {
    if (!prospeccao?.telefone) return;
    await navigator.clipboard.writeText(prospeccao.telefone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSave = async () => {
    if (!prospeccao) return;
    setLoading(true);

    const telefone_e164 = normalizePhoneToE164BR(formData.telefone || "");

    const { error } = await supabase.from("prospeccao" as any).update({
      nome: formData.nome,
      telefone: formData.telefone,
      telefone_e164,
      mes_gestacao: formData.mes_gestacao,
      status: formData.status,
      observacoes: formData.observacoes,
      proxima_acao: formData.proxima_acao,
      proxima_acao_data: proximaAcaoDate ? proximaAcaoDate.toISOString() : null,
      origem: formData.origem,
    } as any).eq("id", prospeccao.id);

    if (error) {
      logError("update_prospeccao", error);
      toast({ variant: "destructive", title: "Erro ao atualizar", description: getUserFriendlyError(error) });
    } else {
      toast({ title: "Prospecção atualizada" });
      onSuccess();
    }
    setLoading(false);
  };

  const handleConvertToProcesso = async () => {
    if (!user || !prospeccao) return;
    setConverting(true);

    const telefone_e164 = normalizePhoneToE164BR(prospeccao.telefone);

    const { data: newMae, error } = await supabase.from("mae_processo").insert({
      nome_mae: prospeccao.nome,
      telefone: prospeccao.telefone,
      telefone_e164,
      cpf: "",
      is_gestante: true,
      mes_gestacao: prospeccao.mes_gestacao || null,
      categoria_previdenciaria: "Não informado",
      status_processo: "Pendência Documental",
      tipo_evento: "Parto",
      contrato_assinado: false,
      verificacao_duas_etapas: false,
      precisa_das: false,
      das_concluido: false,
      origem: "Prospecção",
      user_id: user.id,
    }).select().single();

    if (error) {
      logError("convert_prospeccao", error);
      toast({ variant: "destructive", title: "Erro ao converter", description: getUserFriendlyError(error) });
    } else if (newMae) {
      await supabase.from("prospeccao" as any).update({
        status: "convertido",
        mae_processo_id: newMae.id,
      } as any).eq("id", prospeccao.id);

      toast({ title: "Convertido!", description: `${prospeccao.nome} foi convertida em processo.` });
      onSuccess();
      onOpenChange(false);
      navigate("/?view=kanban");
    }
    setConverting(false);
  };

  const handleDelete = async () => {
    if (!prospeccao) return;
    setLoading(true);
    const { error } = await supabase.from("prospeccao" as any).delete().eq("id", prospeccao.id);
    if (error) {
      logError("delete_prospeccao", error);
      toast({ variant: "destructive", title: "Erro ao excluir", description: getUserFriendlyError(error) });
    } else {
      toast({ title: "Prospecção excluída" });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  if (!prospeccao) return null;

  const isConverted = prospeccao.status === "convertido";
  const mesGestacao = formData.mes_gestacao;
  const isProxima = mesGestacao != null && mesGestacao >= 7;

  const origemLabels: Record<string, string> = {
    chatbot: "Chatbot",
    instagram: "Instagram",
    whatsapp: "WhatsApp",
    outro: "Outro",
  };

  const footerContent = (
    <div className="flex items-center justify-between gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={loading}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Essa prospecção será removida permanentemente. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center gap-2">
        {!isConverted && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handleConvertToProcesso} disabled={converting}>
            {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Converter em Processo
          </Button>
        )}
        <Button onClick={handleSave} disabled={loading} size="sm" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={prospeccao.nome}
      description={`Criado em ${format(parseISO(prospeccao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`}
      footer={footerContent}
      desktopWidth="sm:max-w-[520px]"
      mobileSide="bottom"
    >
      <div className="space-y-5">
        {/* Status + Badges Header */}
        <div className="flex items-center flex-wrap gap-2">
          <Badge variant="secondary" className={`text-xs ${statusProspeccaoColors[prospeccao.status]}`}>
            {statusProspeccaoLabels[prospeccao.status]}
          </Badge>
          {prospeccao.origem && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <MapPin className="h-2.5 w-2.5" />
              {origemLabels[prospeccao.origem] || prospeccao.origem}
            </Badge>
          )}
          {isProxima && (
            <Badge variant="secondary" className={`text-[10px] gap-1 ${mesGestacao! >= 8 ? "bg-pink-200 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
              <Baby className="h-2.5 w-2.5" />
              {mesGestacao}º mês — {mesGestacao! >= 8 ? "Urgente" : "Próxima do parto"}
            </Badge>
          )}
          {isConverted && prospeccao.mae_processo_id && (
            <Badge variant="outline" className="text-[10px] cursor-pointer gap-1 hover:bg-muted" onClick={() => navigate("/?view=kanban")}>
              <ExternalLink className="h-2.5 w-2.5" />
              Ver Processo
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        <Card className="border-border/60">
          <CardContent className="p-3">
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 justify-center text-xs h-9" onClick={handleWhatsApp}>
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 justify-center text-xs h-9" onClick={handleCall}>
                <Phone className="h-3.5 w-3.5 text-blue-600" />
                Ligar
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 justify-center text-xs h-9" onClick={handleCopyPhone}>
                {copiedPhone ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedPhone ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Edit Form */}
        <div className="space-y-4">
          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome</Label>
              <Input value={formData.nome || ""} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Telefone</Label>
              <Input value={formData.telefone || ""} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>

          {/* Gestacao + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Mês Gestação</Label>
              <Select
                value={formData.mes_gestacao ? String(formData.mes_gestacao) : "none"}
                onValueChange={(v) => setFormData({ ...formData, mes_gestacao: v === "none" ? null : parseInt(v) })}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="none">Não informado</SelectItem>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>{m}º mês</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as StatusProspeccao })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[100]">
                  {Object.entries(statusProspeccaoLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Origem */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Origem</Label>
            <Select value={formData.origem || "chatbot"} onValueChange={(v) => setFormData({ ...formData, origem: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="chatbot">Chatbot</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Observações</Label>
            <Textarea value={formData.observacoes || ""} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={3} className="text-sm resize-none" placeholder="Anotações sobre esta prospecção..." />
          </div>

          <Separator className="my-1" />

          {/* Próxima Ação */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Próxima Ação</Label>
            </div>
            <div className="space-y-1.5">
              <Input
                value={formData.proxima_acao || ""}
                onChange={(e) => setFormData({ ...formData, proxima_acao: e.target.value })}
                className="h-9 text-sm"
                placeholder="Ex: Ligar para confirmar interesse..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !proximaAcaoDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {proximaAcaoDate ? format(proximaAcaoDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar mode="single" selected={proximaAcaoDate} onSelect={setProximaAcaoDate} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveOverlay>
  );
}
