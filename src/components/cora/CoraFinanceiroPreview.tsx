import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Landmark, Link2, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Movement = {
  id: string;
  tipo: "CREDIT" | "DEBIT" | "BLOCK" | "UNBLOCK";
  valor_centavos: number;
  ocorrido_em: string;
  transaction_type: string | null;
  descricao: string | null;
  contraparte_nome: string | null;
  contraparte_documento: string | null;
  situacao: "pendente" | "sugerido" | "validado" | "ignorado";
  mae_sugerida_id: string | null;
  parcela_sugerida_id: string | null;
  despesa_sugerida_id: string | null;
  confianca: number | null;
  motivos: string[];
};

const brl = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

async function fetchMovements(): Promise<Movement[]> {
  const { data, error } = await supabase.from("cora_movimentacoes" as any).select("*").order("ocorrido_em", { ascending: false }).limit(500);
  if (error) {
    if (error.code === "42P01" || error.message.includes("schema cache")) return [];
    throw error;
  }
  return (data ?? []) as unknown as Movement[];
}

export function CoraFinanceiroPreview() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("validar");
  const [search, setSearch] = useState("");
  const { data: movements = [], isLoading } = useQuery({ queryKey: ["cora-movimentacoes"], queryFn: fetchMovements });

  const sync = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("cora-sync", { body: { days: 30 } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Extrato da Cora atualizado"); queryClient.invalidateQueries({ queryKey: ["cora-movimentacoes"] }); },
    onError: (error: Error) => toast.error(error.message.includes("non-2xx") ? "A Cora ainda precisa das credenciais de integração" : error.message),
  });

  const confirm = useMutation({
    mutationFn: async (movement: Movement) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("cora_movimentacoes" as any).update({ situacao: "validado", validado_por: auth.user?.id, validado_em: new Date().toISOString() }).eq("id", movement.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Correspondência validada"); queryClient.invalidateQueries({ queryKey: ["cora-movimentacoes"] }); },
    onError: () => toast.error("Não foi possível validar a correspondência"),
  });

  const stats = useMemo(() => ({
    validated: movements.filter((m) => m.situacao === "validado").length,
    suggested: movements.filter((m) => m.situacao === "sugerido").length,
    credits: movements.filter((m) => m.tipo === "CREDIT" && m.situacao === "pendente").length,
    debits: movements.filter((m) => m.tipo === "DEBIT" && m.situacao === "pendente").length,
  }), [movements]);

  const visible = useMemo(() => movements.filter((m) => {
    if (filter === "validar" && !["sugerido", "pendente"].includes(m.situacao)) return false;
    if (filter === "entradas" && m.tipo !== "CREDIT") return false;
    if (filter === "saidas" && m.tipo !== "DEBIT") return false;
    if (filter === "conciliados" && m.situacao !== "validado") return false;
    const q = search.trim().toLowerCase();
    return !q || `${m.contraparte_nome ?? ""} ${m.descricao ?? ""} ${m.contraparte_documento ?? ""}`.toLowerCase().includes(q);
  }), [movements, filter, search]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-emerald-200/70 dark:border-emerald-900/60">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-background dark:from-emerald-950/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><Landmark className="h-5 w-5" /></span>
              <div>
                <div className="flex flex-wrap items-center gap-2"><CardTitle>Conciliação Cora</CardTitle><Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800">Modo de validação</Badge></div>
                <CardDescription className="mt-1">Compare entradas e saídas bancárias com parcelas e despesas do CRM.</CardDescription>
              </div>
            </div>
            <Button onClick={() => sync.mutate()} disabled={sync.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Sincronizar últimos 30 dias
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={CheckCircle2} label="Validados" value={stats.validated} description="Conferidos pela equipe" tone="success" />
            <Metric icon={Link2} label="Sugestões" value={stats.suggested} description="Correspondência provável" tone="warning" />
            <Metric icon={ArrowDownLeft} label="Entradas sem vínculo" value={stats.credits} description="Precisam identificar" tone="danger" />
            <Metric icon={ArrowUpRight} label="Saídas sem categoria" value={stats.debits} description="Precisam classificar" tone="neutral" />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={filter} onValueChange={setFilter}><TabsList className="h-auto flex-wrap justify-start"><TabsTrigger value="validar">Precisa validar</TabsTrigger><TabsTrigger value="entradas">Entradas</TabsTrigger><TabsTrigger value="saidas">Saídas</TabsTrigger><TabsTrigger value="conciliados">Validados</TabsTrigger></TabsList></Tabs>
            <div className="relative w-full lg:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, CPF ou descrição" className="pl-9" /></div>
          </div>

          {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : visible.length ? (
            <div className="overflow-hidden rounded-xl border divide-y">
              {visible.map((movement) => <MovementRow key={movement.id} movement={movement} onConfirm={() => confirm.mutate(movement)} confirming={confirm.isPending} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
              <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Nenhuma movimentação nesta situação</p>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">Depois que as credenciais forem cadastradas, use “Sincronizar” para trazer o extrato automaticamente.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MovementRow({ movement, onConfirm, confirming }: { movement: Movement; onConfirm: () => void; confirming: boolean }) {
  const isCredit = movement.tipo === "CREDIT";
  return (
    <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
      <div className="flex min-w-0 gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isCredit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span>
        <div className="min-w-0"><p className="truncate font-medium">{movement.contraparte_nome || movement.descricao || "Movimentação sem nome"}</p><p className="text-xs text-muted-foreground">{date(movement.ocorrido_em)} · {movement.transaction_type || "Outros"}{movement.contraparte_documento ? ` · ${movement.contraparte_documento}` : ""}</p>{movement.motivos?.length ? <p className="mt-1 text-xs text-emerald-700">{movement.motivos.join(" + ")}</p> : null}</div>
      </div>
      <div className="lg:text-right"><p className={`font-bold tabular-nums ${isCredit ? "text-emerald-700" : "text-rose-700"}`}>{isCredit ? "+" : "−"} {brl(movement.valor_centavos)}</p>{movement.confianca ? <p className="text-xs text-muted-foreground">{movement.confianca}% de confiança</p> : null}</div>
      <div className="flex justify-end">{movement.situacao === "sugerido" ? <Button size="sm" onClick={onConfirm} disabled={confirming}><CheckCircle2 className="h-4 w-4" />Confirmar</Button> : movement.situacao === "validado" ? <Badge className="bg-emerald-600">Validado</Badge> : <Badge variant="outline">Identificar</Badge>}</div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, description, tone }: { icon: typeof CheckCircle2; label: string; value: number; description: string; tone: "success" | "warning" | "danger" | "neutral" }) {
  const colors = { success: "border-emerald-200 bg-emerald-50/60 text-emerald-700", warning: "border-amber-200 bg-amber-50/60 text-amber-700", danger: "border-rose-200 bg-rose-50/60 text-rose-700", neutral: "border-border bg-muted/30 text-foreground" };
  return <div className={`rounded-xl border p-4 ${colors[tone]}`}><Icon className="mb-3 h-5 w-5" /><p className="font-semibold">{label}</p><p className="text-xs opacity-80">{description}</p><p className="mt-3 text-2xl font-bold">{value}</p></div>;
}
