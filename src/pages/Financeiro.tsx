import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BarChart3, Landmark, LayoutDashboard, Loader2, Receipt, RefreshCw, Users } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { CentralFinanceiraTab } from "@/components/central-financeira/CentralFinanceiraTab";
import { CoraFinanceiroPreview } from "@/components/cora/CoraFinanceiroPreview";
import { ResumoFinanceiroCards } from "@/components/financeiro/ResumoFinanceiroCards";
import { FluxoCaixaChart } from "@/components/financeiro/FluxoCaixaChart";
import { SemaforoResumo } from "@/components/financeiro/SemaforoResumo";
import { FinanceiroInsights } from "@/components/financeiro/FinanceiroInsights";
import { CustoPorFornecedorChart } from "@/components/financeiro/CustoPorFornecedorChart";
import { DespesasTable } from "@/components/financeiro/DespesasTable";
import { FinanceiroFilters, FilterPeriod } from "@/components/financeiro/FinanceiroFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePagamentos } from "@/hooks/usePagamentos";
import { useDespesas } from "@/hooks/useDespesas";
import { useFornecedores } from "@/hooks/useFornecedores";
import { getMonth, getYear } from "date-fns";

const VALID_TABS = ["visao-geral", "recebimentos", "cora", "saidas", "forecast"] as const;
type FinanceiroTab = (typeof VALID_TABS)[number];

const Financeiro = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pagamentos, isLoading: pagLoading, isFetching: pagFetching, refetch: refetchPag } = usePagamentos();
  const { despesas, isLoading: despLoading, isFetching: despFetching, refetch: refetchDesp } = useDespesas();
  const { fornecedores, isLoading: fornLoading, refetch: refetchForn } = useFornecedores();

  const [searchQuery, setSearchQuery] = useState("");
  const requestedTab = searchParams.get("tab") as FinanceiroTab | null;
  const activeTab: FinanceiroTab = requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : "visao-geral";

  const now = new Date();
  const [period, setPeriod] = useState<FilterPeriod>("mes");
  const [selectedMonth, setSelectedMonth] = useState(getMonth(now));
  const [selectedYear, setSelectedYear] = useState(getYear(now));

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !adminLoading && user && !isAdmin) navigate("/");
  }, [user, authLoading, adminLoading, isAdmin, navigate]);

  const isLoading = pagLoading || despLoading || fornLoading || adminLoading;
  const isFetching = pagFetching || despFetching;

  const handleRefresh = () => {
    refetchPag();
    refetchDesp();
    refetchForn();
  };

  const handleTabChange = (value: string) => {
    const tab = value as FinanceiroTab;
    setSearchParams(tab === "visao-geral" ? {} : { tab });
  };

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user || !isAdmin) return null;

  const showPeriodFilters = activeTab === "visao-geral" || activeTab === "saidas";

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="space-y-5 p-3 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold md:text-2xl">Financeiro</h1>
              <p className="text-sm text-muted-foreground">Entradas, saídas, conciliação e projeções em um só lugar.</p>
            </div>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showPeriodFilters && (
              <FinanceiroFilters
                period={period}
                onPeriodChange={setPeriod}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
              />
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl p-1.5">
            <Tab value="visao-geral" icon={LayoutDashboard} label="Visão geral" />
            <Tab value="recebimentos" icon={Users} label="Recebimentos" />
            <Tab value="cora" icon={Landmark} label="Conciliação Cora" />
            <Tab value="saidas" icon={Receipt} label="Saídas" />
            <Tab value="forecast" icon={BarChart3} label="Forecast" />
          </TabsList>

          <TabsContent value="visao-geral" className="mt-5 space-y-4">
            <ResumoFinanceiroCards pagamentos={pagamentos} despesas={despesas} period={period} selectedMonth={selectedMonth} selectedYear={selectedYear} />
            <FluxoCaixaChart pagamentos={pagamentos} despesas={despesas} />
            <FinanceiroInsights pagamentos={pagamentos} despesas={despesas} period={period} selectedMonth={selectedMonth} selectedYear={selectedYear} />
            <SemaforoResumo pagamentos={pagamentos} despesas={despesas} fornecedores={fornecedores} period={period} selectedMonth={selectedMonth} selectedYear={selectedYear} />
            <CustoPorFornecedorChart despesas={despesas} fornecedores={fornecedores} />
          </TabsContent>

          <TabsContent value="recebimentos" className="mt-5">
            <CentralFinanceiraTab searchQuery={searchQuery} selectedUserId={undefined} />
          </TabsContent>

          <TabsContent value="cora" className="mt-5">
            <CoraFinanceiroPreview />
          </TabsContent>

          <TabsContent value="saidas" className="mt-5">
            <DespesasTable period={period} selectedMonth={selectedMonth} selectedYear={selectedYear} />
          </TabsContent>

          <TabsContent value="forecast" className="mt-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Previsão financeira</CardTitle>
                <CardDescription>Veja o que está previsto para entrar e sair nos próximos períodos.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-sm text-muted-foreground">A análise detalhada continua disponível na tela atual de Forecast enquanto organizamos os indicadores nesta central.</p>
                <Button onClick={() => navigate("/forecast")}>Abrir Forecast detalhado</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

function Tab({ value, icon: Icon, label }: { value: FinanceiroTab; icon: typeof LayoutDashboard; label: string }) {
  return <TabsTrigger value={value} className="shrink-0 gap-1.5 px-3"><Icon className="h-4 w-4" />{label}</TabsTrigger>;
}

export default Financeiro;
