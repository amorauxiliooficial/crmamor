import { useState } from "react";
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { formatPhone } from "@/lib/formatters";
import { normalizePhoneToE164BR } from "@/lib/phoneUtils";
import { Loader2, Upload, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface ParsedLead {
  nome: string;
  telefone: string;
  telefone_e164: string | null;
  mes_gestacao?: number | null;
  observacoes?: string | null;
  status: "novo" | "duplicado_prospeccao" | "ja_processo";
}

interface ImportProspeccaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportProspeccaoDialog({ open, onOpenChange, onSuccess }: ImportProspeccaoDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rawText, setRawText] = useState("");
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validated, setValidated] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setRawText("");
      setParsedLeads([]);
      setValidated(false);
    }
    onOpenChange(isOpen);
  };

  const handleValidate = async () => {
    if (!rawText.trim()) return;
    setValidating(true);

    try {
      let leads: { nome: string; telefone: string; mes_gestacao?: number; observacoes?: string; origem?: string }[] = [];
      const parsed = JSON.parse(rawText.trim());
      if (Array.isArray(parsed)) {
        leads = parsed;
      } else if (parsed.leads && Array.isArray(parsed.leads)) {
        leads = parsed.leads;
      } else {
        toast({ variant: "destructive", title: "Formato inválido", description: 'Use um array ou { "leads": [...] }' });
        setValidating(false);
        return;
      }

      // Fetch existing phones
      const { data: existingProsp } = await supabase.from("prospeccao" as any).select("telefone");
      const { data: existingMae } = await supabase.from("mae_processo").select("telefone");

      const prospPhones = new Set((existingProsp || []).map((p: any) => p.telefone?.replace(/\D/g, "")));
      const maePhones = new Set((existingMae || []).map((m: any) => m.telefone?.replace(/\D/g, "")));

      const seenInBatch = new Set<string>();
      const result: ParsedLead[] = leads.map((lead) => {
        const telefone_e164 = normalizePhoneToE164BR(lead.telefone);
        const cleanPhone = formatPhone(lead.telefone || "");
        const digits = (lead.telefone || "").replace(/\D/g, "");
        let checkDigits = digits;
        if (checkDigits.startsWith("55") && checkDigits.length >= 12) {
          checkDigits = checkDigits.slice(2);
        }
        let status: ParsedLead["status"] = "novo";

        if (maePhones.has(checkDigits) || maePhones.has(digits)) {
          status = "ja_processo";
        } else if (prospPhones.has(checkDigits) || prospPhones.has(digits)) {
          status = "duplicado_prospeccao";
        } else if (seenInBatch.has(checkDigits)) {
          status = "duplicado_prospeccao";
        }

        seenInBatch.add(checkDigits);

        return {
          nome: lead.nome || "",
          telefone: cleanPhone || lead.telefone || "",
          telefone_e164,
          mes_gestacao: lead.mes_gestacao || null,
          observacoes: lead.observacoes || null,
          status,
        };
      });

      setParsedLeads(result);
      setValidated(true);
    } catch {
      toast({ variant: "destructive", title: "JSON inválido", description: "Verifique o formato do JSON." });
    }
    setValidating(false);
  };

  const novosLeads = parsedLeads.filter((l) => l.status === "novo");

  const handleImport = async () => {
    if (!user || novosLeads.length === 0) return;
    setImporting(true);

    const rows = novosLeads.map((l) => ({
      nome: l.nome,
      telefone: l.telefone,
      telefone_e164: l.telefone_e164,
      mes_gestacao: l.mes_gestacao,
      observacoes: l.observacoes,
      status: "novo",
      user_id: user.id,
    }));

    const { error } = await supabase.from("prospeccao" as any).insert(rows as any);

    if (error) {
      logError("import_prospeccao", error);
      toast({ variant: "destructive", title: "Erro ao importar", description: getUserFriendlyError(error) });
    } else {
      const duplicados = parsedLeads.filter((l) => l.status === "duplicado_prospeccao").length;
      const jaProcesso = parsedLeads.filter((l) => l.status === "ja_processo").length;
      toast({
        title: "Importação concluída",
        description: `${novosLeads.length} inseridos${duplicados > 0 ? `, ${duplicados} duplicados` : ""}${jaProcesso > 0 ? `, ${jaProcesso} já com processo` : ""}`,
      });
      onSuccess();
      handleOpenChange(false);
    }
    setImporting(false);
  };

  const footerContent = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
      {!validated ? (
        <Button onClick={handleValidate} disabled={validating || !rawText.trim()}>
          {validating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Validar
        </Button>
      ) : (
        <Button onClick={handleImport} disabled={importing || novosLeads.length === 0}>
          {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Upload className="h-4 w-4 mr-2" />
          Importar {novosLeads.length} leads
        </Button>
      )}
    </div>
  );

  return (
    <ResponsiveOverlay open={open} onOpenChange={handleOpenChange} title="Importar Lote" description="Cole o JSON com os leads para importação." footer={footerContent} desktopWidth="sm:max-w-2xl" mobileSide="bottom">
      <div className="space-y-4">
        {!validated ? (
          <div className="space-y-2">
            <Label>JSON dos leads</Label>
            <Textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={8} placeholder={'[\n  { "nome": "Maria", "telefone": "11999998888", "mes_gestacao": 5 }\n]'} className="font-mono text-xs" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3 text-sm">
              <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" /> {novosLeads.length} novos</Badge>
              <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3" /> {parsedLeads.filter((l) => l.status === "duplicado_prospeccao").length} duplicados</Badge>
              <Badge variant="secondary" className="gap-1 bg-red-100 text-red-800"><XCircle className="h-3 w-3" /> {parsedLeads.filter((l) => l.status === "ja_processo").length} já processo</Badge>
            </div>
            <div className="rounded-md border max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Mês</TableHead>
                    <TableHead>Obs</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedLeads.map((lead, i) => (
                    <TableRow key={i} className={lead.status === "ja_processo" ? "opacity-50" : lead.status === "duplicado_prospeccao" ? "bg-yellow-50/50" : ""}>
                      <TableCell className="text-sm">{lead.nome}</TableCell>
                      <TableCell className="text-sm">{lead.telefone}</TableCell>
                      <TableCell className="text-sm">{lead.mes_gestacao || "-"}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{lead.observacoes || "-"}</TableCell>
                      <TableCell>
                        {lead.status === "novo" && <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800">Novo</Badge>}
                        {lead.status === "duplicado_prospeccao" && <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-800">Duplicado</Badge>}
                        {lead.status === "ja_processo" && <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-800">Já Processo</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="link" size="sm" onClick={() => { setValidated(false); setParsedLeads([]); }}>← Voltar ao editor</Button>
          </div>
        )}
      </div>
    </ResponsiveOverlay>
  );
}
