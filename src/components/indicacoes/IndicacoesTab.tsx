import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { Indicacao, StatusAbordagem, statusAbordagemLabels, statusAbordagemColors } from "@/types/indicacao";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndicacaoDialog } from "./IndicacaoDialog";
import { IndicacaoFormDialog } from "./IndicacaoFormDialog";
import { Plus, Phone, Search, Users, UserPlus, MessageSquare, XCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IndicacoesTabProps {
  searchQuery?: string;
}

export function IndicacoesTab({ searchQuery = "" }: IndicacoesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicacao, setSelectedIndicacao] = useState<Indicacao | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");

  const fetchIndicacoes = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("indicacoes")
      .select("*")
      .order("data_indicacao", { ascending: false });

    if (error) {
      logError("fetch_indicacoes", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar indicações",
        description: getUserFriendlyError(error),
      });
    } else if (data) {
      setIndicacoes(data as Indicacao[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchIndicacoes();
    }
  }, [user]);

  const removeAccents = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const filteredIndicacoes = useMemo(() => {
    const query = removeAccents((searchQuery || localSearch).toLowerCase().trim());
    if (!query) return indicacoes;

    return indicacoes.filter((ind) => {
      const normalizedNomeIndicada = removeAccents(ind.nome_indicada?.toLowerCase() || "");
      const normalizedNomeIndicadora = removeAccents(ind.nome_indicadora?.toLowerCase() || "");
      const phoneIndicada = ind.telefone_indicada?.replace(/\D/g, "") || "";
      const phoneIndicadora = ind.telefone_indicadora?.replace(/\D/g, "") || "";
      const queryDigits = query.replace(/\D/g, "");

      return (
        normalizedNomeIndicada.includes(query) ||
        normalizedNomeIndicadora.includes(query) ||
        (queryDigits.length > 0 && (phoneIndicada.includes(queryDigits) || phoneIndicadora.includes(queryDigits)))
      );
    });
  }, [indicacoes, searchQuery, localSearch]);

  const stats = useMemo(() => {
    return {
      total: indicacoes.length,
      pendentes: indicacoes.filter((i) => i.status_abordagem === "pendente").length,
      emContato: indicacoes.filter((i) => i.status_abordagem === "em_contato").length,
      interessadas: indicacoes.filter((i) => i.status_abordagem === "interessada").length,
      convertidas: indicacoes.filter((i) => i.status_abordagem === "convertida").length,
      naoInteressadas: indicacoes.filter((i) => i.status_abordagem === "nao_interessada").length,
    };
  }, [indicacoes]);

  const handleRowClick = (indicacao: Indicacao) => {
    setSelectedIndicacao(indicacao);
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-muted-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendentes}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Em Contato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emContato}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Interessadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interessadas}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Convertidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.convertidas}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Não Interessadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.naoInteressadas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setFormDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Indicação
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Indicada</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Indicadora</TableHead>
              <TableHead>Tel. Indicadora</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIndicacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma indicação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredIndicacoes.map((indicacao) => (
                <TableRow
                  key={indicacao.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(indicacao)}
                >
                  <TableCell className="whitespace-nowrap">
                    {format(parseISO(indicacao.data_indicacao), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">{indicacao.nome_indicada}</TableCell>
                  <TableCell>
                    {indicacao.telefone_indicada && (
                      <a
                        href={`https://wa.me/${indicacao.telefone_indicada.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        {indicacao.telefone_indicada}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>{indicacao.nome_indicadora || "-"}</TableCell>
                  <TableCell>
                    {indicacao.telefone_indicadora && (
                      <a
                        href={`https://wa.me/${indicacao.telefone_indicadora.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        {indicacao.telefone_indicadora}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusAbordagemColors[indicacao.status_abordagem as StatusAbordagem]}>
                      {statusAbordagemLabels[indicacao.status_abordagem as StatusAbordagem]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {indicacao.motivo_abordagem || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <IndicacaoDialog
        indicacao={selectedIndicacao}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchIndicacoes}
      />

      <IndicacaoFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={fetchIndicacoes}
      />
    </div>
  );
}
