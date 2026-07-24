import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BellRing,
  FileText,
  FolderOpen,
  Loader2,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  UserRoundCheck,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { MaeDetailDialog } from "@/components/mae/MaeDetailDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { mapDbToMae } from "@/hooks/useMaesData";
import { usePrivateUpdatesAccess } from "@/hooks/usePrivateUpdatesAccess";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MaeProcesso } from "@/types/mae";

type UpdateType = "todos" | "resumo_ia" | "contato" | "documento" | "status" | "cadastro";
type Period = "hoje" | "7" | "30";

interface MotherUpdate {
  id: string;
  mae_id: string;
  tipo: Exclude<UpdateType, "todos">;
  titulo: string;
  descricao: string | null;
  origem: string | null;
  created_at: string;
  mae_processo: {
    id: string;
    nome_mae: string;
    status_processo: string;
  };
}

const TYPE_CONFIG: Record<
  Exclude<UpdateType, "todos">,
  { label: string; icon: typeof BellRing; className: string }
> = {
  resumo_ia: {
    label: "Resumo IA",
    icon: MessageSquareText,
    className: "bg-violet-100 text-violet-700 border-violet-200",
  },
  contato: {
    label: "Contato",
    icon: UserRoundCheck,
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  documento: {
    label: "Documento",
    icon: FolderOpen,
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  status: {
    label: "Etapa",
    icon: RefreshCw,
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  cadastro: {
    label: "Cadastro",
    icon: FileText,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const periodStart = (period: Period) => {
  if (period === "hoje") return startOfDay(new Date());
  return startOfDay(subDays(new Date(), Number(period) - 1));
};

async function fetchUpdates(period: Period): Promise<MotherUpdate[]> {
  const { data, error } = await supabase
    .from("mae_atualizacoes")
    .select(`
      id,
      mae_id,
      tipo,
      titulo,
      descricao,
      origem,
      created_at,
      mae_processo!inner (
        id,
        nome_mae,
        status_processo
      )
    `)
    .gte("created_at", periodStart(period).toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as MotherUpdate[];
}

export default function AtualizacoesMaes() {
  const { user, loading: authLoading } = useAuth();
  const { canViewUpdates, isLoading: accessLoading } = usePrivateUpdatesAccess();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("7");
  const [type, setType] = useState<UpdateType>("todos");
  const [selectedMae, setSelectedMae] = useState<MaeProcesso | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, navigate, user]);

  const updatesQuery = useQuery({
    queryKey: ["private-mother-updates", period],
    queryFn: () => fetchUpdates(period),
    enabled: Boolean(user && canViewUpdates),
    staleTime: 60 * 1000,
  });

  const filteredUpdates = useMemo(
    () =>
      (updatesQuery.data ?? []).filter((update) =>
        type === "todos" ? true : update.tipo === type,
      ),
    [type, updatesQuery.data],
  );

  const metrics = useMemo(() => {
    const updates = updatesQuery.data ?? [];
    return {
      today: updates.filter((update) => isToday(new Date(update.created_at))).length,
      mothers: new Set(updates.map((update) => update.mae_id)).size,
      summaries: updates.filter((update) => update.tipo === "resumo_ia").length,
    };
  }, [updatesQuery.data]);

  const openMother = async (maeId: string) => {
    const { data, error } = await supabase
      .from("mae_processo")
      .select("*")
      .eq("id", maeId)
      .single();

    if (!error && data) {
      setSelectedMae(mapDbToMae(data as Record<string, unknown>));
    }
  };

  if (authLoading || accessLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewUpdates) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <ShieldAlert className="h-14 w-14 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-1 text-muted-foreground">
            Esta central é privada e não está liberada para este usuário.
          </p>
        </div>
        <Button onClick={() => navigate("/")}>Voltar ao início</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <Header searchQuery="" onSearchChange={() => {}} />

      <main className="mx-auto max-w-6xl space-y-5 p-3 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
                <BellRing className="h-6 w-6 text-primary" />
                Atualizações das Mães
              </h1>
              <p className="text-sm text-muted-foreground">
                Resumos, contatos, documentos e alterações importantes em um só lugar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
              <SelectTrigger className="w-[150px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => updatesQuery.refetch()}
              disabled={updatesQuery.isFetching}
              title="Atualizar"
            >
              <RefreshCw className={cn("h-4 w-4", updatesQuery.isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Atualizações hoje
              </p>
              <p className="mt-1 text-3xl font-bold text-primary">{metrics.today}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mães acompanhadas
              </p>
              <p className="mt-1 text-3xl font-bold">{metrics.mothers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Resumos por IA
              </p>
              <p className="mt-1 text-3xl font-bold text-violet-600">{metrics.summaries}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["todos", "resumo_ia", "contato", "documento", "status", "cadastro"] as UpdateType[]).map(
            (filterType) => (
              <Button
                key={filterType}
                variant={type === filterType ? "default" : "outline"}
                size="sm"
                onClick={() => setType(filterType)}
                className="h-8"
              >
                {filterType === "todos" ? "Todos" : TYPE_CONFIG[filterType].label}
              </Button>
            ),
          )}
        </div>

        <section className="space-y-3">
          {updatesQuery.isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-xl" />
            ))
          ) : updatesQuery.isError ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="font-medium">Não foi possível carregar as atualizações.</p>
                <Button className="mt-3" variant="outline" onClick={() => updatesQuery.refetch()}>
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : filteredUpdates.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <BellRing className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 font-medium">Nenhuma atualização neste período.</p>
                <p className="text-sm text-muted-foreground">
                  Novos contatos, resumos e documentos aparecerão aqui automaticamente.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredUpdates.map((update) => {
              const config = TYPE_CONFIG[update.tipo];
              const Icon = config.icon;

              return (
                <button
                  key={update.id}
                  type="button"
                  onClick={() => openMother(update.mae_id)}
                  className="w-full rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex gap-3">
                    <div className={cn("mt-0.5 rounded-lg border p-2", config.className)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold">{update.mae_processo.nome_mae}</p>
                          <p className="text-sm font-medium text-foreground/80">{update.titulo}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="outline" className={config.className}>
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(update.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      {update.descricao && (
                        <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
                          {update.descricao}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Etapa atual: {update.mae_processo.status_processo}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </section>
      </main>

      <MaeDetailDialog
        mae={selectedMae}
        open={Boolean(selectedMae)}
        onOpenChange={(open) => {
          if (!open) setSelectedMae(null);
        }}
      />
    </div>
  );
}
