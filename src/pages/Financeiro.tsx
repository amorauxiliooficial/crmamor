import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { usePagamentos } from "@/hooks/usePagamentos";
import { useDespesas } from "@/hooks/useDespesas";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  LayoutDashboard,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { ResumoFinanceiroCards } from "@/components/financeiro/ResumoFinanceiroCards";
import { FluxoCaixaChart } from "@/components/financeiro/FluxoCaixaChart";
import { PrevisaoMaeCard } from "@/components/financeiro/PrevisaoMaeCard";
import { DespesasTable } from "@/components/financeiro/DespesasTable";

const Financeiro = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { pagamentos, isLoading: pagLoading, isFetching: pagFetching, refetch: refetchPag } = usePagamentos();
  const { despesas, isLoading: despLoading, isFetching: despFetching, refetch: refetchDesp } = useDespesas();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const isLoading = pagLoading || despLoading;
  const isFetching = pagFetching || despFetching;

  const handleRefresh = () => {
    refetchPag();
    refetchDesp();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="p-3 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 md:h-10 md:w-10">
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <h1 className="text-lg md:text-2xl font-bold">Financeiro</h1>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching} className="h-8">
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>

        {/* Resumo Cards */}
        <ResumoFinanceiroCards pagamentos={pagamentos} despesas={despesas} />

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="despesas" className="gap-1.5">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Despesas</span>
            </TabsTrigger>
            <TabsTrigger value="previsao" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Previsão</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <FluxoCaixaChart pagamentos={pagamentos} despesas={despesas} />
              </div>
              <div>
                <PrevisaoMaeCard pagamentos={pagamentos} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="despesas" className="mt-4">
            <DespesasTable />
          </TabsContent>

          <TabsContent value="previsao" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PrevisaoMaeCard pagamentos={pagamentos} />
              <FluxoCaixaChart pagamentos={pagamentos} despesas={despesas} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Financeiro;
