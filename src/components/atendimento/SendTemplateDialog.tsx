import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, FileText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWaTemplates, useSendTemplate, type WaTemplate } from "@/hooks/useWaTemplates";

interface SendTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  phone: string;
}

export function SendTemplateDialog({ open, onOpenChange, conversationId, phone }: SendTemplateDialogProps) {
  const { data: templates, isLoading } = useWaTemplates();
  const sendTemplate = useSendTemplate();
  const [selected, setSelected] = useState<WaTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!templates) return [];
    if (!search.trim()) return templates.filter(t => t.status === "APPROVED");
    const q = search.toLowerCase();
    return templates.filter(t => t.status === "APPROVED" && (t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)));
  }, [templates, search]);

  // Extract variable placeholders from components_schema
  const extractedVars = useMemo(() => {
    if (!selected?.components_schema) return [];
    const vars: { key: string; componentIndex: number; paramIndex: number }[] = [];
    const schema = Array.isArray(selected.components_schema) ? selected.components_schema : [];
    schema.forEach((comp: any, ci: number) => {
      if (comp.example?.body_text) {
        comp.example.body_text[0]?.forEach((_: string, pi: number) => {
          vars.push({ key: `body_${ci}_${pi}`, componentIndex: ci, paramIndex: pi });
        });
      }
      // Also check for numbered placeholders like {{1}}, {{2}} in text
      const text = comp.text || "";
      const matches = text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((m: string, pi: number) => {
          const k = `${comp.type || "body"}_${ci}_${pi}`;
          if (!vars.find(v => v.key === k)) {
            vars.push({ key: k, componentIndex: ci, paramIndex: pi });
          }
        });
      }
    });
    return vars;
  }, [selected]);

  const handleSend = () => {
    if (!selected) return;

    // Build components array for Meta API
    const components: any[] = [];
    const schema = Array.isArray(selected.components_schema) ? selected.components_schema : [];
    
    schema.forEach((comp: any, ci: number) => {
      const varsForComp = extractedVars.filter(v => v.componentIndex === ci);
      if (varsForComp.length > 0) {
        components.push({
          type: (comp.type || "body").toLowerCase(),
          parameters: varsForComp.map(v => ({
            type: "text",
            text: variables[v.key] || "",
          })),
        });
      }
    });

    sendTemplate.mutate(
      {
        to: phone,
        conversation_id: conversationId,
        template_name: selected.name,
        template_language: selected.language_code,
        template_components: components,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelected(null);
          setVariables({});
        },
      }
    );
  };

  const handleBack = () => {
    setSelected(null);
    setVariables({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {selected ? "Preencher template" : "Enviar Template"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {selected
              ? `Template: ${selected.name}`
              : "Selecione um template aprovado para retomar a conversa"}
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <Input
                placeholder="Buscar template..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <ScrollArea className="max-h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground/50">Nenhum template encontrado</p>
                  <p className="text-xs text-muted-foreground/30 mt-1">Cadastre templates em Configurações</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/20 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {t.category}
                        </Badge>
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
        ) : (
          <div className="space-y-4">
            {/* Template preview */}
            <div className="p-3 bg-muted/10 rounded-lg border border-border/10">
              {Array.isArray(selected.components_schema) && selected.components_schema.map((comp: any, i: number) => (
                <div key={i} className="mb-1">
                  {comp.type === "HEADER" && (
                    <p className="text-xs font-semibold text-muted-foreground/60">{comp.text}</p>
                  )}
                  {(comp.type === "BODY" || comp.type === "body") && (
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{comp.text}</p>
                  )}
                  {comp.type === "FOOTER" && (
                    <p className="text-[10px] text-muted-foreground/40 mt-1">{comp.text}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Variable inputs */}
            {extractedVars.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Variáveis</Label>
                {extractedVars.map((v, i) => (
                  <div key={v.key} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground/50">
                      {`{{${i + 1}}}`}
                    </Label>
                    <Input
                      placeholder={`Valor para {{${i + 1}}}`}
                      value={variables[v.key] || ""}
                      onChange={e => setVariables(prev => ({ ...prev, [v.key]: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleBack} className="flex-1">
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
