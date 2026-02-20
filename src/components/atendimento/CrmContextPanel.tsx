import { useState } from "react";
import {
  FileCheck, Phone, Mail, Copy, Check, MapPin,
  CalendarClock, ChevronDown, ChevronUp, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
            className="h-5 w-5 rounded-md"
            onClick={() => {
              navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">Copiar</TooltipContent>
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
    <div className="flex items-center justify-between py-1.5 group">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
          <p className="text-xs font-medium truncate">{value}</p>
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
        className="flex items-center justify-between w-full py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        {title}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

export function CrmContextPanel({ conversa, className }: CrmContextPanelProps) {
  if (!conversa) return null;

  // Mock CRM data - will be replaced with real data when linked to mae_processo
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
    <div className={cn("w-[320px] shrink-0 border-l border-border/50 flex flex-col h-full bg-card/60 backdrop-blur-sm", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Contexto CRM</h2>
        <p className="text-sm font-medium mt-1 truncate">{conversa.nome ?? conversa.telefone}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-1">

          {/* Status card */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Etapa do Processo</span>
              <Badge variant="outline" className="text-[10px] h-5 px-2 border-primary/30 text-primary">
                ⏳ {mockCrmData.etapa}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] h-5 px-2">{mockCrmData.categoria}</Badge>
              {mockCrmData.contrato && (
                <Badge variant="outline" className="text-[10px] h-5 px-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  <FileCheck className="h-2.5 w-2.5 mr-1" /> Contrato
                </Badge>
              )}
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* Pendências */}
          <CollapsibleSection title={`Pendências (${pendenciasDone}/${mockCrmData.pendencias.length})`}>
            <div className="space-y-1.5">
              {mockCrmData.pendencias.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className={cn(
                    "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    p.done ? "bg-emerald-500/20 border-emerald-500" : "border-border/60"
                  )}>
                    {p.done && <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <span className={cn(
                    "text-xs",
                    p.done ? "text-muted-foreground line-through" : "text-foreground"
                  )}>
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <Separator className="bg-border/30" />

          {/* Follow-ups */}
          <CollapsibleSection title="Próximos Follow-ups">
            <div className="space-y-2">
              {mockCrmData.followUps.map((f, i) => (
                <div key={i} className={cn(
                  "flex items-center justify-between py-1.5 px-2.5 rounded-lg",
                  f.urgente ? "bg-destructive/5 border border-destructive/10" : "bg-muted/20"
                )}>
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarClock className={cn(
                      "h-3 w-3 shrink-0",
                      f.urgente ? "text-destructive" : "text-muted-foreground/60"
                    )} />
                    <span className="text-xs truncate">{f.label}</span>
                  </div>
                  <span className={cn(
                    "text-[10px] shrink-0 ml-2 font-medium",
                    f.urgente ? "text-destructive" : "text-muted-foreground/60"
                  )}>
                    {f.data}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <Separator className="bg-border/30" />

          {/* Dados cadastrais */}
          <CollapsibleSection title="Dados Cadastrais" defaultOpen={false}>
            <div className="space-y-0.5">
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
