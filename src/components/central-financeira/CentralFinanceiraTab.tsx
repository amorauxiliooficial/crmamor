import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Wallet, Search, Loader2, ArrowLeft } from "lucide-react";
import { PagamentosTab } from "@/components/pagamentos/PagamentosTab";
import { CentralFinanceiraDialog } from "@/components/central-financeira/CentralFinanceiraDialog";
import { useMaesData } from "@/hooks/useMaesData";
import { formatCpf } from "@/lib/formatters";
import type { MaeProcesso } from "@/types/mae";

interface Props {
  searchQuery: string;
  selectedUserId?: string;
}

export function CentralFinanceiraTab({ searchQuery, selectedUserId }: Props) {
  const [subTab, setSubTab] = useState("pagamentos");
  const { maes, loading } = useMaesData();
  const [localSearch, setLocalSearch] = useState("");
  const [selectedMae, setSelectedMae] = useState<MaeProcesso | null>(null);

  // Only approved mothers
  const aprovadas = useMemo(
    () => maes.filter((m) => m.status_processo === "✅ Aprovada"),
    [maes]
  );

  const filteredMaes = useMemo(() => {
    const q = (localSearch || searchQuery || "").toLowerCase().trim();
    if (!q) return aprovadas;
    return aprovadas.filter(
      (m) =>
        m.nome_mae?.toLowerCase().includes(q) ||
        (m.cpf || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
    );
  }, [aprovadas, localSearch, searchQuery]);

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={(v) => { setSubTab(v); setSelectedMae(null); }}>
        <TabsList>
          <TabsTrigger value="pagamentos" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="central" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Central Financeira da Amor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pagamentos" className="mt-4">
          <PagamentosTab searchQuery={searchQuery} selectedUserId={selectedUserId} />
        </TabsContent>

        <TabsContent value="central" className="mt-4 space-y-3">
          {selectedMae ? (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedMae(null)} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Voltar para a lista
              </Button>
              <CentralFinanceiraDialog mae={selectedMae} inline />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar mãe aprovada por nome ou CPF..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Badge variant="outline">{filteredMaes.length} aprovadas</Badge>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMaes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Nenhuma mãe aprovada encontrada
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredMaes.map((mae) => (
                    <Card
                      key={mae.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setSelectedMae(mae)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm truncate">
                              {mae.nome_mae}
                            </h3>
                            <p className="text-xs text-muted-foreground font-mono">
                              {mae.cpf ? formatCpf(mae.cpf) : "—"}
                            </p>
                            <Badge variant="outline" className="mt-2 text-[10px]">
                              {mae.status_processo}
                            </Badge>
                          </div>
                          <Wallet className="h-4 w-4 text-primary shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
