import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useComissoes, ComissaoMae, ComissaoResumoUsuario } from "@/hooks/useComissoes";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronRight,
  Percent,
  ArrowLeft,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Comissoes = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { maesComComissao, resumoPorUsuario, isLoading, refetch } = useComissoes();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [editingMae, setEditingMae] = useState<ComissaoMae | null>(null);
  const [editPercentual, setEditPercentual] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filteredResumo = useMemo(() => {
    if (!searchQuery.trim()) return resumoPorUsuario;
    const query = searchQuery.toLowerCase();
    return resumoPorUsuario.filter(
      (r) =>
        r.usuario_nome?.toLowerCase().includes(query) ||
        r.usuario_email?.toLowerCase().includes(query)
    );
  }, [resumoPorUsuario, searchQuery]);

  const filteredMaes = useMemo(() => {
    let filtered = maesComComissao;
    if (selectedUserId) {
      filtered = filtered.filter((m) => m.user_id === selectedUserId);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.nome_mae.toLowerCase().includes(query) ||
          m.cpf.includes(query) ||
          m.usuario_nome?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [maesComComissao, selectedUserId, searchQuery]);

  const maesPorUsuario = useMemo(() => {
    const map = new Map<string, ComissaoMae[]>();
    maesComComissao.forEach((mae) => {
      if (!map.has(mae.user_id)) {
        map.set(mae.user_id, []);
      }
      map.get(mae.user_id)!.push(mae);
    });
    return map;
  }, [maesComComissao]);

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleEditPercentual = (mae: ComissaoMae) => {
    setEditingMae(mae);
    setEditPercentual(mae.percentual_comissao?.toString() || "");
  };

  const handleSavePercentual = async () => {
    if (!editingMae) return;
    setSaving(true);

    const percentual = parseFloat(editPercentual) || 0;

    try {
      // Update percentual_comissao on pagamentos_mae if exists
      if (editingMae.pagamento_id) {
        const { error } = await supabase
          .from("pagamentos_mae")
          .update({ percentual_comissao: percentual })
          .eq("id", editingMae.pagamento_id);

        if (error) throw error;
      }

      // Also update on mae_processo for reference
      const { error: maeError } = await supabase
        .from("mae_processo")
        .update({ percentual_comissao: percentual })
        .eq("id", editingMae.id);

      if (maeError) throw maeError;

      toast({
        title: "Sucesso",
        description: "Percentual de comissão atualizado",
      });

      refetch();
      setEditingMae(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Stats totals
  const totals = useMemo(() => {
    return resumoPorUsuario.reduce(
      (acc, r) => ({
        total_maes: acc.total_maes + r.total_maes,
        valor_total: acc.valor_total + r.valor_total_pagamentos,
        comissao_total: acc.comissao_total + r.comissao_total,
        comissao_recebida: acc.comissao_recebida + r.comissao_recebida,
        comissao_pendente: acc.comissao_pendente + r.comissao_pendente,
      }),
      {
        total_maes: 0,
        valor_total: 0,
        comissao_total: 0,
        comissao_recebida: 0,
        comissao_pendente: 0,
      }
    );
  }, [resumoPorUsuario]);

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
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onViewChange={(view) => {
          if (view === "kanban" || view === "table") navigate("/");
          else if (view === "pagamentos") navigate("/pagamentos");
        }}
        currentView="comissoes"
      />

      <main className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">
            Pipeline de Comissões
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Mães Aprovadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totals.total_maes}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valor Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totals.valor_total)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Comissão Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totals.comissao_total)}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Recebida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(totals.comissao_recebida)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(totals.comissao_pendente)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline by User */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Por Usuário</h2>

          {filteredResumo.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma mãe aprovada encontrada
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredResumo.map((resumo) => {
                const isExpanded = expandedUsers.has(resumo.user_id);
                const userMaes = maesPorUsuario.get(resumo.user_id) || [];

                return (
                  <Collapsible
                    key={resumo.user_id}
                    open={isExpanded}
                    onOpenChange={() => toggleUserExpand(resumo.user_id)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <CardTitle className="text-base">
                                  {resumo.usuario_nome || resumo.usuario_email || "Usuário"}
                                </CardTitle>
                                {resumo.usuario_email && resumo.usuario_nome && (
                                  <p className="text-sm text-muted-foreground">
                                    {resumo.usuario_email}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-center">
                                <p className="font-semibold">{resumo.maes_aprovadas}</p>
                                <p className="text-muted-foreground text-xs">Mães</p>
                              </div>
                              <div className="text-center">
                                <p className="font-semibold">
                                  {formatCurrency(resumo.valor_total_pagamentos)}
                                </p>
                                <p className="text-muted-foreground text-xs">Total</p>
                              </div>
                              <div className="text-center">
                                <p className="font-semibold text-emerald-600">
                                  {formatCurrency(resumo.comissao_recebida)}
                                </p>
                                <p className="text-muted-foreground text-xs">Recebida</p>
                              </div>
                              <div className="text-center">
                                <p className="font-semibold text-amber-600">
                                  {formatCurrency(resumo.comissao_pendente)}
                                </p>
                                <p className="text-muted-foreground text-xs">Pendente</p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <ScrollArea className="max-h-[400px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Mãe</TableHead>
                                  <TableHead>CPF</TableHead>
                                  <TableHead className="text-center">Comissão %</TableHead>
                                  <TableHead className="text-right">Valor Total</TableHead>
                                  <TableHead className="text-right">Comissão</TableHead>
                                  <TableHead className="text-right">Recebida</TableHead>
                                  <TableHead className="text-right">Pendente</TableHead>
                                  <TableHead></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {userMaes.map((mae) => (
                                  <TableRow key={mae.id}>
                                    <TableCell className="font-medium">
                                      {mae.nome_mae}
                                    </TableCell>
                                    <TableCell>{mae.cpf}</TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="secondary">
                                        {mae.percentual_comissao || 0}%
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(mae.valor_total_pagamento)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(mae.comissao_calculada)}
                                    </TableCell>
                                    <TableCell className="text-right text-emerald-600">
                                      {formatCurrency(mae.comissao_recebida)}
                                    </TableCell>
                                    <TableCell className="text-right text-amber-600">
                                      {formatCurrency(mae.comissao_pendente)}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditPercentual(mae)}
                                      >
                                        <Percent className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit Percentual Dialog */}
      <Dialog open={!!editingMae} onOpenChange={(open) => !open && setEditingMae(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Comissão - {editingMae?.nome_mae}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Percentual de Comissão (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={editPercentual}
                onChange={(e) => setEditPercentual(e.target.value)}
                placeholder="Ex: 10"
              />
              <p className="text-sm text-muted-foreground">
                Digite o percentual que será calculado sobre cada parcela paga.
              </p>
            </div>

            {editingMae && parseFloat(editPercentual) > 0 && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium">Prévia do cálculo:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Valor Total:</span>
                  <span>{formatCurrency(editingMae.valor_total_pagamento)}</span>
                  <span className="text-muted-foreground">Comissão Total:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      (editingMae.valor_total_pagamento * parseFloat(editPercentual || "0")) /
                        100
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingMae(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePercentual} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Comissoes;
