import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Landmark, Link2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  { number: "1", title: "Cora informa", text: "Um Pix, boleto ou pagamento muda de situação." },
  { number: "2", title: "Sistema confere", text: "Valor, CPF, vencimento e cobrança são comparados." },
  { number: "3", title: "Baixa automática", text: "A parcela da mãe é atualizada sem planilha." },
];

export function CoraFinanceiroPreview() {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-emerald-200/70 dark:border-emerald-900/60">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-background dark:from-emerald-950/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><Landmark className="h-5 w-5" /></span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>Conciliação Cora</CardTitle>
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Prévia</Badge>
                </div>
                <CardDescription className="mt-1">Conferência automática entre a movimentação bancária e as baixas do sistema.</CardDescription>
              </div>
            </div>
            <Button disabled variant="outline"><Link2 className="h-4 w-4" />Conectar Cora</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-3 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="rounded-xl border bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{step.number}</span><p className="font-medium">{step.title}</p></div>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={CheckCircle2} label="Pagos e baixados" description="Tudo certo" tone="success" />
            <Metric icon={ArrowDownLeft} label="Entrou no Cora" description="Falta dar baixa" tone="warning" />
            <Metric icon={AlertCircle} label="Baixa sem entrada" description="Precisa conferir" tone="danger" />
            <Metric icon={ArrowUpRight} label="Saídas do Cora" description="Falta classificar" tone="neutral" />
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
            <RefreshCw className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">A conexão automática ainda não está ativada</p>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">Quando a API da Cora for conectada, as divergências e confirmações aparecerão aqui, sem importar CSV ou XLS.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, description, tone }: { icon: typeof CheckCircle2; label: string; description: string; tone: "success" | "warning" | "danger" | "neutral" }) {
  const colors = {
    success: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
    warning: "border-amber-200 bg-amber-50/60 text-amber-700",
    danger: "border-rose-200 bg-rose-50/60 text-rose-700",
    neutral: "border-border bg-muted/30 text-foreground",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[tone]}`}>
      <Icon className="mb-3 h-5 w-5" />
      <p className="font-semibold">{label}</p>
      <p className="text-xs opacity-80">{description}</p>
      <p className="mt-3 text-2xl font-bold">—</p>
    </div>
  );
}
