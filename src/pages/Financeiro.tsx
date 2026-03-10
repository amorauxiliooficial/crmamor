import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePagamentos } from "@/hooks/usePagamentos";
import { useDespesas } from "@/hooks/useDespesas";
import { useFornecedores } from "@/hooks/useFornecedores";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  LayoutDashboard,
  Receipt,
  Users,
  Building2,
} from "lucide-react";
import { ResumoFinanceiroCards } from "@/components/financeiro/ResumoFinanceiroCards";
import { CrescimentoMoM } from "@/components/financeiro/CrescimentoMoM";
import { FluxoCaixaChart } from "@/components/financeiro/FluxoCaixaChart";
import { CustoPorFornecedorChart } from "@/components/financeiro/CustoPorFornecedorChart";
import { DespesasTable } from "@/components/financeiro/DespesasTable";
import { ReceitasMaesTable } from "@/components/financeiro/ReceitasMaesTable";
import { FornecedoresTable } from "@/components/financeiro/FornecedoresTable";
import { FinanceiroFilters, FilterPeriod } from "@/components/financeiro/FinanceiroFilters";
import { getMonth, getYear } from "date-fns";

const Financeiro = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { pagamentos, isLoading: pagLoading, isFetching: pagFetching, refetch: refetchPag } = usePagamentos();
  const { despesas, isLoading: despLoading, isFetching: despFetching, refetch: refetchDesp } = useDespesas();
  const { fornecedores, isLoading: fornLoading, refetch: refetchForn } = useFornecedores();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Filter state
  const now = new Date();
  const [period, setPeriod] = useState<FilterPeriod>("mes");
  const [selectedMonth, setSelectedMonth] = useState(getMonth(now));
  const [selectedYear, setSelectedYear] = useState(getYear(now));

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !adminLoading && user && !isAdmin) {
      navigate("/");
    }
  }, [user, authLoading, adminLoading, isAdmin, navigate]);

  const isLoading = pagLoading || despLoading || fornLoading || adminLoading;
  const isFetching = pagFetching || despFetching;

  const handleRefresh = () => {
    refetchPag();
    refetchDesp();
    refetchForn();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Header Row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 md:h-10 md:w-10">
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <h1 className="text-lg md:text-2xl font-bold">Financeiro</h1>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <FinanceiroFilters
              period={period}
              onPeriodChange={setPeriod}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
            />
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching} className="h-8">
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Resumo Cards */}
        <ResumoFinanceiroCards 
          pagamentos={pagamentos} 
          despesas={despesas}
          period={period}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="receitas" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Receitas</span>
            </TabsTrigger>
            <TabsTrigger value="despesas" className="gap-1.5">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Despesas</span>
            </TabsTrigger>
            <TabsTrigger value="fornecedores" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Fornecedores</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <CrescimentoMoM
              pagamentos={pagamentos}
              despesas={despesas}
              period={period}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FluxoCaixaChart pagamentos={pagamentos} despesas={despesas} />
              <CustoPorFornecedorChart despesas={despesas} fornecedores={fornecedores} />
            </div>
            <ReceitasMaesTable 
              pagamentos={pagamentos}
              period={period}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </TabsContent>

          <TabsContent value="receitas" className="mt-4">
            <ReceitasMaesTable 
              pagamentos={pagamentos}
              period={period}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </TabsContent>

          <TabsContent value="despesas" className="mt-4">
            <DespesasTable
              period={period}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </TabsContent>

          <TabsContent value="fornecedores" className="mt-4">
            <FornecedoresTable />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Financeiro;
