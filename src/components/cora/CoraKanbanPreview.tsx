import { useState } from "react";
import { ArrowRight, CheckCircle2, FileUp, Landmark, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const previewRows = [
  { name: "Maria de exemplo", value: "R$ 200,00", status: "Correspondência encontrada", tone: "success" },
  { name: "Ana de exemplo", value: "R$ 150,00", status: "Revisar correspondência", tone: "warning" },
  { name: "Pix recebido", value: "R$ 80,00", status: "Não identificado", tone: "neutral" },
] as const;

export function CoraKanbanPreview() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-r from-emerald-50/90 via-background to-background shadow-none dark:border-emerald-900/60 dark:from-emerald-950/25">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Landmark className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">Cora no Kanban</h3>
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  Prévia
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Importe o extrato e confira as correspondências antes de dar baixa nas parcelas.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-3 gap-2 text-center">
              <PreviewMetric label="Recebidos" value="—" />
              <PreviewMetric label="A conciliar" value="—" />
              <PreviewMetric label="Sem vínculo" value="—" />
            </div>
            <Button type="button" size="sm" onClick={() => setOpen(true)} className="h-10 bg-emerald-600 hover:bg-emerald-700">
              <FileUp className="h-4 w-4" />
              Ver como funciona
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="md:max-w-2xl">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Landmark className="h-5 w-5" />
            </div>
            <DialogTitle>Prévia da conciliação Cora</DialogTitle>
            <DialogDescription>
              Demonstração visual: nenhum arquivo será enviado e nenhuma baixa será realizada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3">
            <Step icon={FileUp} number="1" title="Importar" description="Extrato CSV ou OFX" />
            <Step icon={Search} number="2" title="Conferir" description="Nome, CPF, valor e data" />
            <Step icon={CheckCircle2} number="3" title="Confirmar" description="Atualizar parcela e Kanban" />
          </div>

          <div className="overflow-hidden rounded-xl border">
            <div className="flex items-center justify-between border-b bg-muted/35 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Movimentações importadas</p>
                <p className="text-xs text-muted-foreground">Exemplos de como a conferência será apresentada</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Exemplo
              </Badge>
            </div>

            <div className="divide-y">
              {previewRows.map((row) => (
                <div key={`${row.name}-${row.value}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">Pix recebido na conta Cora</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{row.value}</p>
                  <StatusBadge tone={row.tone}>{row.status}</StatusBadge>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground">
            <ArrowRight className="h-4 w-4 shrink-0 text-emerald-600" />
            Após a confirmação, o pagamento aparecerá no card da mãe e na Central Financeira.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[74px] rounded-lg border bg-background/80 px-2.5 py-1.5">
      <p className="text-base font-semibold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Step({
  icon: Icon,
  number,
  title,
  description,
}: {
  icon: typeof FileUp;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <Icon className="h-4 w-4 text-emerald-600" />
        <span className="text-xs font-medium text-muted-foreground">{number}</span>
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "neutral";
  children: string;
}) {
  const className = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
      : "border-border bg-muted/50 text-muted-foreground";

  return (
    <Badge variant="outline" className={className}>
      {children}
    </Badge>
  );
}
