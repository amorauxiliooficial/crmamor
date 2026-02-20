import { useState } from "react";
import {
  FileCheck, Phone, Mail, Copy, Check, MapPin,
  CalendarClock, ChevronDown, ChevronUp, Shield,
  MessageSquare, Clock, Sparkles, FileText, UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Conversa } from "@/data/atendimentoMock";

interface CrmContextPanelProps {
  conversa: Conversa | null;
  className?: string;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-4 w-4 rounded text-muted-foreground/30 hover:text-foreground"
            onClick={() => {
              navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="h-2 w-2 text-emerald-500" /> : <Copy className="h-2 w-2" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-[10px]">Copiar</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function InfoRow({ icon: Icon, label, value, copyable = false }: {
  icon: React.ElementType;
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 group">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground/45 uppercase tracking-wider">{label}</p>
          <p className="text-xs font-medium truncate">{value}</p>
        </div>
      </div>
      {copyable && <CopyButton value={value} />}
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = true, children, count }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {title}
          {count != null && <span className="text-[10px] font-mono text-muted-foreground/30">({count})</span>}
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="pb-2">{children}</div>
      </div>
    </div>
  );
}

// Mock timeline events for unified view
interface TimelineItem {
  id: string;
  type: "message" | "activity" | "status_change" | "note" | "follow_up";
  title: string;
  time: string;
  icon: React.ElementType;
  color: string;
}

const mockTimeline: TimelineItem[] = [
  { id: "t1", type: "message", title: "Mensagem enviada", time: "há 5m", icon: MessageSquare, color: "text-primary/60" },
  { id: "t2", type: "activity", title: "Documentos solicitados", time: "há 2h", icon: FileText, color: "text-amber-500/60" },
  { id: "t3", type: "follow_up", title: "Follow-up: verificar INSS", time: "há 1d", icon: CalendarClock, color: "text-primary/60" },
  { id: "t4", type: "status_change", title: "Status → Aguardando INSS", time: "há 2d", icon: Clock, color: "text-muted-foreground/50" },
  { id: "t5", type: "note", title: "Contrato assinado", time: "há 5d", icon: FileCheck, color: "text-emerald-500/60" },
  { id: "t6", type: "activity", title: "Conversa assumida por Maria", time: "há 7d", icon: UserCheck, color: "text-primary/60" },
];

export function CrmContextPanel({ conversa, className }: CrmContextPanelProps) {
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

          {/* Timeline unificada */}
          <CollapsibleSection title="Timeline" count={mockTimeline.length}>
            <div className="relative pl-4">
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border/20" />
              {mockTimeline.map((event) => (
                <div key={event.id} className="relative flex items-start gap-2.5 py-1.5">
                  <div className="absolute left-[-9px] top-2 h-3 w-3 rounded-full bg-background border border-border/30 flex items-center justify-center">
                    <event.icon className={cn("h-2 w-2", event.color)} />
                  </div>
                  <div className="flex-1 min-w-0 ml-1.5">
                    <p className="text-xs truncate">{event.title}</p>
                    <p className="text-[10px] text-muted-foreground/40 font-mono">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Pendências */}
          <CollapsibleSection title="Pendências" count={pendenciasDone} defaultOpen={false}>
            <div className="space-y-1">
              {mockCrmData.pendencias.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className={cn(
                    "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                    p.done ? "bg-emerald-500/10 border-emerald-500/40" : "border-border/30"
                  )}>
                    {p.done && <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <span className={cn(
                    "text-xs",
                    p.done ? "text-muted-foreground/40 line-through" : "text-foreground/70"
                  )}>
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Follow-ups */}
          <CollapsibleSection title="Follow-ups" count={mockCrmData.followUps.length} defaultOpen={false}>
            <div className="space-y-1">
              {mockCrmData.followUps.map((f, i) => (
                <div key={i} className={cn(
                  "flex items-center justify-between py-1.5 px-2.5 rounded-lg",
                  f.urgente ? "bg-destructive/5" : "bg-muted/5"
                )}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CalendarClock className={cn(
                      "h-3 w-3 shrink-0",
                      f.urgente ? "text-destructive/50" : "text-muted-foreground/40"
                    )} />
                    <span className="text-xs truncate">{f.label}</span>
                  </div>
                  <span className={cn(
                    "text-[10px] shrink-0 ml-2 font-mono",
                    f.urgente ? "text-destructive/50" : "text-muted-foreground/40"
                  )}>
                    {f.data}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Dados cadastrais */}
          <CollapsibleSection title="Dados" defaultOpen={false}>
            <div className="space-y-0">
              <InfoRow icon={Phone} label="Telefone" value={conversa.telefone} copyable />
              {conversa.nome && (
                <InfoRow icon={Shield} label="Nome" value={conversa.nome} copyable />
              )}
              <InfoRow icon={Mail} label="E-mail" value="—" />
              <InfoRow icon={MapPin} label="UF" value="—" />
            </div>
          </CollapsibleSection>
        </div>
      </ScrollArea>
    </div>
  );
}
