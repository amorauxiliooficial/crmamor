import { useState } from "react";
import {
  FileCheck, Phone, Mail, Copy, Check, MapPin,
  CalendarClock, ChevronDown, ChevronUp, Shield,
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
            className="h-5 w-5 rounded-md text-muted-foreground/40 hover:text-foreground"
            onClick={() => {
              navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
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
        <Icon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
        <div className="min-w-0">
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">{label}</p>
          <p className="text-[11px] font-medium truncate">{value}</p>
        </div>
      </div>
      {copyable && <CopyButton value={value} />}
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = true, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 hover:text-foreground transition-colors"
      >
        {title}
        {open ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
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
      { label: "Conferência mensal", data: "22/03", urgente: false },
    ],
  };

  const pendenciasDone = mockCrmData.pendencias.filter((p) => p.done).length;

  return (
    <div className={cn("w-[300px] shrink-0 border-l border-border/30 flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/20">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40">Contexto CRM</p>
        <p className="text-xs font-medium mt-0.5 truncate">{conversa.nome ?? conversa.telefone}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-2.5 space-y-1">

          {/* Status card */}
          <div className="bg-muted/15 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40">Etapa</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/20 text-primary rounded-full">
                {mockCrmData.etapa}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 rounded-full">{mockCrmData.categoria}</Badge>
              {mockCrmData.contrato && (
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                  <FileCheck className="h-2 w-2 mr-0.5" /> Contrato
                </Badge>
              )}
            </div>
          </div>

          {/* Pendências */}
          <CollapsibleSection title={`Pendências (${pendenciasDone}/${mockCrmData.pendencias.length})`}>
            <div className="space-y-1">
              {mockCrmData.pendencias.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <div className={cn(
                    "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0",
                    p.done ? "bg-emerald-500/15 border-emerald-500/50" : "border-border/40"
                  )}>
                    {p.done && <Check className="h-2 w-2 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <span className={cn(
                    "text-[11px]",
                    p.done ? "text-muted-foreground/50 line-through" : "text-foreground/80"
                  )}>
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Follow-ups */}
          <CollapsibleSection title="Follow-ups">
            <div className="space-y-1">
              {mockCrmData.followUps.map((f, i) => (
                <div key={i} className={cn(
                  "flex items-center justify-between py-1 px-2 rounded-lg",
                  f.urgente ? "bg-destructive/5" : "bg-muted/10"
                )}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CalendarClock className={cn(
                      "h-2.5 w-2.5 shrink-0",
                      f.urgente ? "text-destructive/60" : "text-muted-foreground/40"
                    )} />
                    <span className="text-[11px] truncate">{f.label}</span>
                  </div>
                  <span className={cn(
                    "text-[9px] shrink-0 ml-1.5 font-medium font-mono",
                    f.urgente ? "text-destructive/60" : "text-muted-foreground/40"
                  )}>
                    {f.data}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Dados cadastrais */}
          <CollapsibleSection title="Dados Cadastrais" defaultOpen={false}>
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
