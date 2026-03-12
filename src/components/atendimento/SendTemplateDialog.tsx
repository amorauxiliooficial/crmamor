import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, FileText, Search, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWaTemplates, useSendTemplate, type WaTemplate } from "@/hooks/useWaTemplates";

interface SendTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  phone: string;
  waName?: string | null;
}

function firstNameFrom(name?: string | null): string {
  const s = (name || "").trim();
  return s ? s.split(/\s+/)[0] : "tudo bem";
}

export function SendTemplateDialog({ open, onOpenChange, conversationId, phone, waName }: SendTemplateDialogProps) {
  const { data: templates, isLoading } = useWaTemplates();
  const sendTemplate = useSendTemplate();
  const [primeiroNome, setPrimeiroNome] = useState("");
  const [showOtherTemplates, setShowOtherTemplates] = useState(false);
  const [search, setSearch] = useState("");

  // Legacy mode state (for "Outros templates")
  const [legacySelected, setLegacySelected] = useState<WaTemplate | null>(null);
  const [legacyVars, setLegacyVars] = useState<Record<string, string>>({});

  // Resolve primeiro nome on open
  useEffect(() => {
    if (!open) return;
    setShowOtherTemplates(false);
    setLegacySelected(null);
    setLegacyVars({});
    setSearch("");

    // Try lead_intake first, then waName, then fallback
    (async () => {
      try {
        const { data } = await supabase
          .from("lead_intake" as any)
          .select("name")
          .eq("wa_conversation_id", conversationId)
          .maybeSingle();
        const leadName = (data as any)?.name;
        setPrimeiroNome(firstNameFrom(leadName || waName));
      } catch {
        setPrimeiroNome(firstNameFrom(waName));
      }
    })();
  }, [open, conversationId, waName]);

  const filtered = useMemo(() => {
    if (!templates) return [];
    const approved = templates.filter(t => t.status === "APPROVED");
    if (!search.trim()) return approved;
    const q = search.toLowerCase();
    return approved.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }, [templates, search]);

  // Default flow: send retomar_atendimento
  const handleSendDefault = () => {
    sendTemplate.mutate(
      {
        to: phone,
        conversation_id: conversationId,
        template_name: "retomar_atendimento",
        template_language: "pt_BR",
        template_components: [],
        variables: [primeiroNome || "tudo bem"],
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  // Legacy flow: send any selected template
  const handleSendLegacy = () => {
    if (!legacySelected) return;
    const schema = Array.isArray(legacySelected.components_schema) ? legacySelected.components_schema : [];
    const extractedVars: { key: string; componentIndex: number; paramIndex: number }[] = [];
    schema.forEach((comp: any, ci: number) => {
      const text = comp.text || "";
      const matches = text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((m: string, pi: number) => {
          const k = `${comp.type || "body"}_${ci}_${pi}`;
          if (!extractedVars.find(v => v.key === k)) {
            extractedVars.push({ key: k, componentIndex: ci, paramIndex: pi });
          }
        });
      }
    });

    const components: any[] = [];
    schema.forEach((comp: any, ci: number) => {
      const varsForComp = extractedVars.filter(v => v.componentIndex === ci);
      if (varsForComp.length > 0) {
        components.push({
          type: (comp.type || "body").toLowerCase(),
          parameters: varsForComp.map(v => ({
            type: "text",
            text: legacyVars[v.key] || "",
          })),
        });
      }
    });

    sendTemplate.mutate(
      {
        to: phone,
        conversation_id: conversationId,
        template_name: legacySelected.name,
        template_language: legacySelected.language_code,
        template_components: components,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setLegacySelected(null);
          setLegacyVars({});
          setShowOtherTemplates(false);
        },
      }
    );
  };

  // Render legacy template detail
  if (showOtherTemplates && legacySelected) {
    const schema = Array.isArray(legacySelected.components_schema) ? legacySelected.components_schema : [];
    const extractedVars: { key: string; componentIndex: number; paramIndex: number }[] = [];
    schema.forEach((comp: any, ci: number) => {
      const text = comp.text || "";
      const matches = text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((_: string, pi: number) => {
          const k = `${comp.type || "body"}_${ci}_${pi}`;
          if (!extractedVars.find(v => v.key === k)) {
            extractedVars.push({ key: k, componentIndex: ci, paramIndex: pi });
          }
        });
      }
    });

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Preencher template</DialogTitle>
            <DialogDescription className="text-xs">Template: {legacySelected.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/10 rounded-lg border border-border/10">
              {schema.map((comp: any, i: number) => (
                <div key={i} className="mb-1">
                  {comp.type === "HEADER" && <p className="text-xs font-semibold text-muted-foreground/60">{comp.text}</p>}
                  {(comp.type === "BODY" || comp.type === "body") && <p className="text-sm text-foreground/80 whitespace-pre-wrap">{comp.text}</p>}
                  {comp.type === "FOOTER" && <p className="text-[10px] text-muted-foreground/40 mt-1">{comp.text}</p>}
                </div>
              ))}
            </div>
            {extractedVars.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Variáveis</Label>
                {extractedVars.map((v, i) => (
                  <div key={v.key} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground/50">{`{{${i + 1}}}`}</Label>
                    <Input
                      placeholder={`Valor para {{${i + 1}}}`}
                      value={legacyVars[v.key] || ""}
                      onChange={e => setLegacyVars(prev => ({ ...prev, [v.key]: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setLegacySelected(null)} className="flex-1">
                Voltar
              </Button>
              <Button size="sm" onClick={handleSendLegacy} disabled={sendTemplate.isPending} className="flex-1 gap-1.5">
                {sendTemplate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render legacy template list
  if (showOtherTemplates) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Outros Templates</DialogTitle>
            <DialogDescription className="text-xs">Selecione um template aprovado</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowOtherTemplates(false)} className="gap-1 px-2">
                <ChevronLeft className="h-3.5 w-3.5" /> Voltar
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <Input placeholder="Buscar template..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
            </div>
            <ScrollArea className="max-h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground/50">Nenhum template encontrado</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map(t => (
                    <button key={t.id} onClick={() => setLegacySelected(t)} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-[10px] h-5">{t.category}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                        {t.language_code} • {(() => {
                          const schema = Array.isArray(t.components_schema) ? t.components_schema : [];
                          const bodyComp = schema.find((c: any) => c.type === "BODY" || c.type === "body");
                          return bodyComp?.text?.slice(0, 80) || "Sem preview";
                        })()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Default view: retomar_atendimento with single variable
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Enviar Template</DialogTitle>
          <DialogDescription className="text-xs">
            Template: retomar_atendimento (pt_BR)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {"{{1}}"} — Primeiro nome
            </Label>
            <Input
              value={primeiroNome}
              onChange={e => setPrimeiroNome(e.target.value)}
              placeholder="Nome do contato"
              className="h-8 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOtherTemplates(true)}
              className="flex-1"
            >
              Outros templates
            </Button>
            <Button
              size="sm"
              onClick={handleSendDefault}
              disabled={sendTemplate.isPending}
              className="flex-1 gap-1.5"
            >
              {sendTemplate.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
