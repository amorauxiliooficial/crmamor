import { useState } from "react";
import {
  FileCheck, Phone, Mail, Copy, Check, MapPin,
  CalendarClock, ChevronDown, ChevronUp, Shield,
  MessageSquare, Clock, Sparkles, FileText, UserCheck,
  Plus, Star, PhoneOff, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMotherContacts, useMotherContactActions, type MotherContact } from "@/hooks/useMotherContacts";
import { useAssignmentEvents, type AssignmentEvent } from "@/hooks/useAssignmentEvents";
import { useTimelineEvents, type TimelineEvent } from "@/hooks/useTimelineEvents";
import type { Conversa } from "@/data/atendimentoMock";

interface CrmContextPanelProps {
  conversa: Conversa | null;
  className?: string;
  maeId?: string | null;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" className="h-4 w-4 rounded text-muted-foreground/30 hover:text-foreground"
            onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? <Check className="h-2 w-2 text-emerald-500" /> : <Copy className="h-2 w-2" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-[10px]">Copiar</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CollapsibleSection({ title, defaultOpen = true, children, count }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode; count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 hover:text-foreground transition-colors">
        <span className="flex items-center gap-1.5">
          {title}
          {count != null && <span className="text-[10px] font-mono text-muted-foreground/30">({count})</span>}
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      <div className={cn("overflow-hidden transition-all duration-200", open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0")}>
        <div className="pb-2">{children}</div>
      </div>
    </div>
  );
}

function AddContactDialog({ maeId, open, onOpenChange }: { maeId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [contactType, setContactType] = useState<"whatsapp" | "phone" | "email">("whatsapp");
  const [value, setValue] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const { addContact } = useMotherContactActions();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!value.trim()) return;
    try {
      await addContact.mutateAsync({ mae_id: maeId, contact_type: contactType, value: value.trim(), is_primary: isPrimary });
      toast({ title: "Contato adicionado ✅" });
      setValue("");
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Adicionar contato</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={contactType} onValueChange={(v) => setContactType(v as any)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="phone">Telefone</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder={contactType === "email" ? "email@exemplo.com" : "(11) 99999-9999"} value={value} onChange={(e) => setValue(e.target.value)} className="h-9 text-xs" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="rounded" />
            Definir como principal
          </label>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleSubmit} disabled={!value.trim() || addContact.isPending} className="text-xs">
            {addContact.isPending ? "Salvando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactsList({ maeId }: { maeId: string }) {
  const { data: contacts, isLoading } = useMotherContacts(maeId);
  const { deactivateContact, setPrimary } = useMotherContactActions();
  const [showAdd, setShowAdd] = useState(false);
  const { toast } = useToast();

  const typeIcon = { whatsapp: Smartphone, phone: Phone, email: Mail };

  return (
    <div className="space-y-1">
      {isLoading && <p className="text-[10px] text-muted-foreground/40">Carregando...</p>}
      {contacts?.filter(c => c.active).map((c) => {
        const Icon = typeIcon[c.contact_type] || Phone;
        return (
          <div key={c.id} className="flex items-center justify-between py-1 group">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium truncate">{c.value_e164}</p>
                  {c.is_primary && <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />}
                </div>
                <p className="text-[10px] text-muted-foreground/40">{c.contact_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton value={c.value_e164} />
              {!c.is_primary && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-4 w-4 text-muted-foreground/30 hover:text-amber-500"
                        onClick={() => { setPrimary.mutate({ id: c.id, mae_id: maeId }); toast({ title: "Principal atualizado" }); }}>
                        <Star className="h-2 w-2" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-[10px]">Tornar principal</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-4 w-4 text-muted-foreground/30 hover:text-destructive"
                      onClick={() => { deactivateContact.mutate({ id: c.id, mae_id: maeId }); toast({ title: "Contato desativado" }); }}>
                      <PhoneOff className="h-2 w-2" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-[10px]">Desativar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        );
      })}
      <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] text-primary/60 hover:text-primary gap-1" onClick={() => setShowAdd(true)}>
        <Plus className="h-3 w-3" /> Adicionar contato
      </Button>
      <AddContactDialog maeId={maeId} open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}

function TimelineSection({ maeId }: { maeId: string }) {
  const { data: events, isLoading } = useTimelineEvents(maeId);
  const { data: assignments } = useAssignmentEvents(maeId);

  // Merge timeline + assignments into unified list
  const unified = [...(events || []).map(e => ({
    id: e.id,
    title: e.title,
    type: e.event_type,
    time: e.created_at,
  })), ...(assignments || []).map(a => ({
    id: a.id,
    title: a.reason || "Atendente alterado",
    type: "assignment_changed",
    time: a.created_at,
  }))].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);

  const iconMap: Record<string, { icon: React.ElementType; color: string }> = {
    message_sent: { icon: MessageSquare, color: "text-primary/60" },
    message_received: { icon: MessageSquare, color: "text-primary/60" },
    stage_changed: { icon: Clock, color: "text-muted-foreground/50" },
    followup_created: { icon: CalendarClock, color: "text-primary/60" },
    assignment_changed: { icon: UserCheck, color: "text-amber-500/60" },
    phone_added: { icon: Smartphone, color: "text-emerald-500/60" },
    note: { icon: FileText, color: "text-amber-500/60" },
    contract_signed: { icon: FileCheck, color: "text-emerald-500/60" },
  };

  if (isLoading) return <p className="text-[10px] text-muted-foreground/40">Carregando timeline...</p>;
  if (unified.length === 0) return <p className="text-[10px] text-muted-foreground/40">Sem eventos</p>;

  return (
    <div className="relative pl-4">
      <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border/20" />
      {unified.map((event) => {
        const { icon: Icon, color } = iconMap[event.type] || { icon: FileText, color: "text-muted-foreground/40" };
        const relTime = formatRelativeTime(event.time);
        return (
          <div key={event.id} className="relative flex items-start gap-2.5 py-1.5">
            <div className="absolute left-[-9px] top-2 h-3 w-3 rounded-full bg-background border border-border/30 flex items-center justify-center">
              <Icon className={cn("h-2 w-2", color)} />
            </div>
            <div className="flex-1 min-w-0 ml-1.5">
              <p className="text-xs truncate">{event.title}</p>
              <p className="text-[10px] text-muted-foreground/40 font-mono">{relTime}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "há 1d";
  return `há ${days}d`;
}

export function CrmContextPanel({ conversa, className, maeId }: CrmContextPanelProps) {
  if (!conversa) return null;

  const mockCrmData = {
    etapa: "Aguardando Análise INSS",
    categoria: "CLT",
    contrato: true,
    pendencias: [
      { label: "CNIS atualizado", done: true },
      { label: "Certidão de nascimento", done: true },
      { label: "Comprovante de residência", done: false },
      { label: "Carteira de trabalho", done: false },
    ],
    followUps: [
      { label: "Verificar retorno INSS", data: "Amanhã", urgente: true },
      { label: "Enviar lembrete documentos", data: "Em 3 dias", urgente: false },
    ],
  };

  const pendenciasDone = mockCrmData.pendencias.filter((p) => p.done).length;

  return (
    <div className={cn("w-[360px] shrink-0 border-l border-border/20 flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/15">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/45">Contexto CRM</p>
        <p className="text-sm font-medium mt-1 truncate">{conversa.nome ?? conversa.telefone}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-1">
          {/* Status card */}
          <div className="bg-muted/10 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/45">Etapa</span>
              <Badge variant="outline" className="text-[10px] h-5 px-2 border-primary/15 text-primary rounded-full">
                {mockCrmData.etapa}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] h-5 px-2 rounded-full">{mockCrmData.categoria}</Badge>
              {mockCrmData.contrato && (
                <Badge variant="outline" className="text-[10px] h-5 px-2 border-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full">
                  <FileCheck className="h-3 w-3 mr-1" /> Contrato
                </Badge>
              )}
            </div>
          </div>

          {/* Contacts */}
          <CollapsibleSection title="Contatos" defaultOpen={true}>
            {maeId ? (
              <ContactsList maeId={maeId} />
            ) : (
              <div className="space-y-0">
                <div className="flex items-center justify-between py-1 group">
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground/45 uppercase tracking-wider">Telefone</p>
                      <p className="text-xs font-medium truncate">{conversa.telefone}</p>
                    </div>
                  </div>
                  <CopyButton value={conversa.telefone} />
                </div>
                {conversa.nome && (
                  <div className="flex items-center gap-2 py-1">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    <div><p className="text-[10px] text-muted-foreground/45 uppercase tracking-wider">Nome</p><p className="text-xs font-medium">{conversa.nome}</p></div>
                  </div>
                )}
              </div>
            )}
          </CollapsibleSection>

          {/* Timeline unificada */}
          <CollapsibleSection title="Timeline" count={undefined}>
            {maeId ? (
              <TimelineSection maeId={maeId} />
            ) : (
              <p className="text-[10px] text-muted-foreground/40">Vincule a uma mãe para ver a timeline.</p>
            )}
          </CollapsibleSection>

          {/* Pendências */}
          <CollapsibleSection title="Pendências" count={pendenciasDone} defaultOpen={false}>
            <div className="space-y-1">
              {mockCrmData.pendencias.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                    p.done ? "bg-emerald-500/10 border-emerald-500/40" : "border-border/30")}>
                    {p.done && <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <span className={cn("text-xs", p.done ? "text-muted-foreground/40 line-through" : "text-foreground/70")}>{p.label}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Follow-ups */}
          <CollapsibleSection title="Follow-ups" count={mockCrmData.followUps.length} defaultOpen={false}>
            <div className="space-y-1">
              {mockCrmData.followUps.map((f, i) => (
                <div key={i} className={cn("flex items-center justify-between py-1.5 px-2.5 rounded-lg",
                  f.urgente ? "bg-destructive/5" : "bg-muted/5")}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CalendarClock className={cn("h-3 w-3 shrink-0", f.urgente ? "text-destructive/50" : "text-muted-foreground/40")} />
                    <span className="text-xs truncate">{f.label}</span>
                  </div>
                  <span className={cn("text-[10px] shrink-0 ml-2 font-mono", f.urgente ? "text-destructive/50" : "text-muted-foreground/40")}>{f.data}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      </ScrollArea>
    </div>
  );
}
