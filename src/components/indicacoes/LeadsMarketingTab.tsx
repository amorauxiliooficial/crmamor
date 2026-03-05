import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search,
  Users,
  Loader2,
  MessageSquare,
  Copy,
  Check,
  Megaphone,
  ExternalLink,
} from "lucide-react";
import { format, parseISO, subDays, subWeeks, subMonths, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeadMarketing {
  id: string;
  wa_name: string | null;
  wa_phone: string;
  created_at: string;
  last_message_at: string | null;
  status: string;
  unread_count: number;
}

interface LeadsMarketingTabProps {
  searchQuery?: string;
}

export function LeadsMarketingTab({ searchQuery = "" }: LeadsMarketingTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState<LeadMarketing[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState("");
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const fetchLeads = async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("wa_conversations")
      .select("id, wa_name, wa_phone, created_at, last_message_at, status, unread_count")
      .is("mae_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      logError("fetch_leads_marketing", error);
      toast({ variant: "destructive", title: "Erro ao carregar leads", description: getUserFriendlyError(error) });
    } else if (data) {
      setLeads(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.id) fetchLeads();
  }, [user?.id]);

  const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filteredLeads = useMemo(() => {
    const query = removeAccents((searchQuery || localSearch).toLowerCase().trim());
    if (!query) return leads;

    return leads.filter((lead) => {
      const normalizedName = removeAccents(lead.wa_name?.toLowerCase() || "");
      const phoneDigits = lead.wa_phone.replace(/\D/g, "");
      const queryDigits = query.replace(/\D/g, "");

      return (
        normalizedName.includes(query) ||
        (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
      );
    });
  }, [leads, searchQuery, localSearch]);

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 13 && cleaned.startsWith("55")) {
      const ddd = cleaned.slice(2, 4);
      const num = cleaned.slice(4);
      if (num.length === 9) return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
      return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
    }
    return phone;
  };

  const handleCopyPhone = async (phone: string, id: string) => {
    await navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
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
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Total de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Conversas Abertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.filter((l) => l.status === "open").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.filter((l) => {
                const today = new Date().toISOString().split("T")[0];
                return l.created_at.startsWith(today);
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table / Mobile cards */}
      {isMobile ? (
        <div className="space-y-3">
          {filteredLeads.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum lead encontrado</p>
          ) : (
            filteredLeads.map((lead) => (
              <Card key={lead.id} className="cursor-pointer hover:bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{lead.wa_name || "Sem nome"}</p>
                      <p className="text-sm text-muted-foreground">{formatPhone(lead.wa_phone)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(lead.created_at), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {lead.unread_count > 0 && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {lead.unread_count} não lida{lead.unread_count > 1 ? "s" : ""}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Primeiro Contato</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Não Lidas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum lead de marketing encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const phone = lead.wa_phone.replace(/\D/g, "");
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{format(parseISO(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(lead.created_at), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {lead.wa_name || <span className="text-muted-foreground italic">Sem nome</span>}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={`https://wa.me/${phone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  {formatPhone(lead.wa_phone)}
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>Abrir WhatsApp</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopyPhone(lead.wa_phone, lead.id)}
                                >
                                  {copiedPhoneId === lead.id ? (
                                    <Check className="h-3 w-3 text-primary" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar telefone</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.status === "open" ? "default" : "secondary"} className="text-xs">
                          {lead.status === "open" ? "Aberta" : lead.status === "resolved" ? "Resolvida" : lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.unread_count > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            {lead.unread_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
