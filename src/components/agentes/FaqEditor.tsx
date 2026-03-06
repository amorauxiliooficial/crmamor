import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, Search, Copy, ChevronDown, ChevronRight, GripVertical,
  Upload, Download, BookOpen, AlertCircle, MessageSquare,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqEditorProps {
  value: FaqItem[];
  onChange: (faqs: FaqItem[]) => void;
}

const ANSWER_TEMPLATES = [
  { label: "Curto", text: "Sim, {{assunto}}. Para mais informações, entre em contato conosco." },
  { label: "Detalhado", text: "Olá! Sobre {{assunto}}:\n\n1. **Primeiro passo**: ...\n2. **Segundo passo**: ...\n\nSe precisar de mais ajuda, estou à disposição! 😊" },
];

export function FaqEditor({ value, onChange }: FaqEditorProps) {
  const { toast } = useToast();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const addFaq = useCallback(() => {
    const newFaqs = [...value, { question: "", answer: "" }];
    onChange(newFaqs);
    setExpandedIndex(newFaqs.length - 1);
  }, [value, onChange]);

  const removeFaq = useCallback((i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
    if (expandedIndex === i) setExpandedIndex(null);
    else if (expandedIndex !== null && expandedIndex > i) setExpandedIndex(expandedIndex - 1);
  }, [value, onChange, expandedIndex]);

  const duplicateFaq = useCallback((i: number) => {
    const newFaqs = [...value];
    newFaqs.splice(i + 1, 0, { ...value[i] });
    onChange(newFaqs);
    setExpandedIndex(i + 1);
  }, [value, onChange]);

  const updateFaq = useCallback((i: number, field: "question" | "answer", val: string) => {
    onChange(value.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }, [value, onChange]);

  const insertTemplate = useCallback((i: number, template: string) => {
    const current = value[i]?.answer || "";
    const newVal = current ? `${current}\n\n${template}` : template;
    updateFaq(i, "answer", newVal);
  }, [value, updateFaq]);

  // Drag & drop
  const handleDragStart = (i: number) => {
    dragItemRef.current = i;
    setDragIndex(i);
  };
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOverIndex(i);
  };
  const handleDrop = (i: number) => {
    const from = dragItemRef.current;
    if (from === null || from === i) { setDragIndex(null); setDragOverIndex(null); return; }
    const newFaqs = [...value];
    const [moved] = newFaqs.splice(from, 1);
    newFaqs.splice(i, 0, moved);
    onChange(newFaqs);
    setDragIndex(null);
    setDragOverIndex(null);
    if (expandedIndex === from) setExpandedIndex(i);
    else if (expandedIndex !== null) {
      if (from < expandedIndex && i >= expandedIndex) setExpandedIndex(expandedIndex - 1);
      else if (from > expandedIndex && i <= expandedIndex) setExpandedIndex(expandedIndex + 1);
    }
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  // Import
  const handleImport = () => {
    if (!importText.trim()) return;
    const lines = importText.split("\n").map(l => l.trim()).filter(Boolean);
    const newFaqs: FaqItem[] = [];
    let currentQ = "";
    for (const line of lines) {
      const qMatch = line.match(/^(?:pergunta|p|q)\s*[:：]\s*(.+)/i);
      const aMatch = line.match(/^(?:resposta|r|a)\s*[:：]\s*(.+)/i);
      if (qMatch) {
        if (currentQ) newFaqs.push({ question: currentQ, answer: "" });
        currentQ = qMatch[1].trim();
      } else if (aMatch && currentQ) {
        newFaqs.push({ question: currentQ, answer: aMatch[1].trim() });
        currentQ = "";
      }
    }
    if (currentQ) newFaqs.push({ question: currentQ, answer: "" });

    if (newFaqs.length === 0) {
      toast({ title: "Nenhum FAQ encontrado", description: "Use o formato: Pergunta: ... / Resposta: ...", variant: "destructive" });
      return;
    }
    onChange([...value, ...newFaqs]);
    setImportText("");
    setShowImport(false);
    toast({ title: `${newFaqs.length} FAQ(s) importado(s) ✅` });
  };

  // Export
  const handleExport = () => {
    const json = JSON.stringify(value, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "faq-agente.json"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "FAQ exportado ✅" });
  };

  const filtered = searchQuery.trim()
    ? value.map((faq, i) => ({ faq, i })).filter(({ faq }) =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : value.map((faq, i) => ({ faq, i }));

  const isIncomplete = (faq: FaqItem) => (!faq.question.trim() || !faq.answer.trim());

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Perguntas e Respostas
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                FAQ do agente · {value.length} {value.length === 1 ? "item" : "itens"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {value.length > 0 && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setShowImport(true)} className="text-[11px] h-7 px-2" title="Importar">
                    <Upload className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleExport} className="text-[11px] h-7 px-2" title="Exportar JSON">
                    <Download className="h-3 w-3" />
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={addFaq} className="text-[11px] h-7">
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {value.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border/30 rounded-xl">
              <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/15 mb-2" />
              <p className="text-xs text-muted-foreground/50">Nenhuma pergunta cadastrada</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button size="sm" variant="ghost" onClick={addFaq} className="text-[11px] h-7">
                  <Plus className="h-3 w-3 mr-1" /> Criar primeira
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowImport(true)} className="text-[11px] h-7">
                  <Upload className="h-3 w-3 mr-1" /> Importar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Search */}
              {value.length > 3 && (
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar no FAQ..."
                    className="pl-8 text-sm h-8"
                  />
                </div>
              )}

              {/* FAQ Items */}
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-0.5">
                {filtered.map(({ faq, i }) => {
                  const isOpen = expandedIndex === i;
                  const incomplete = isIncomplete(faq);

                  return (
                    <div
                      key={i}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={e => handleDragOver(e, i)}
                      onDrop={() => handleDrop(i)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "rounded-xl border transition-all overflow-hidden",
                        isOpen ? "border-primary/20 shadow-sm" : "border-border/30",
                        dragOverIndex === i && "border-primary/40 bg-primary/5",
                        dragIndex === i && "opacity-40",
                      )}
                    >
                      {/* Collapsed header */}
                      <div
                        onClick={() => setExpandedIndex(isOpen ? null : i)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-2 cursor-pointer transition-colors group",
                          isOpen ? "bg-muted/10" : "hover:bg-muted/5"
                        )}
                      >
                        <div
                          className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 shrink-0"
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                        </div>

                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0 font-mono">
                          {i + 1}
                        </Badge>

                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm truncate",
                            faq.question.trim() ? "font-medium" : "text-muted-foreground/40 italic"
                          )}>
                            {faq.question.trim() || "Pergunta sem título..."}
                          </p>
                        </div>

                        {incomplete && (
                          <AlertCircle className="h-3 w-3 text-amber-500/60 shrink-0" />
                        )}

                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground/40 hover:text-foreground"
                            onClick={e => { e.stopPropagation(); duplicateFaq(i); }} title="Duplicar">
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground/40 hover:text-destructive"
                            onClick={e => { e.stopPropagation(); removeFaq(i); }} title="Remover">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {isOpen
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        }
                      </div>

                      {/* Expanded editor */}
                      {isOpen && (
                        <div className="border-t border-border/20 px-3 py-3 space-y-3 bg-muted/5">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground">Pergunta</label>
                            <Input
                              value={faq.question}
                              onChange={e => updateFaq(i, "question", e.target.value)}
                              placeholder="Ex: Como funciona o processo?"
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-medium text-muted-foreground">Resposta</label>
                              <div className="flex items-center gap-1">
                                {ANSWER_TEMPLATES.map(t => (
                                  <button
                                    key={t.label}
                                    onClick={() => insertTemplate(i, t.text)}
                                    className="text-[9px] px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                                  >
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <Textarea
                              value={faq.answer}
                              onChange={e => updateFaq(i, "answer", e.target.value)}
                              placeholder="Resposta do agente..."
                              className="min-h-[80px] max-h-[200px] text-sm resize-y"
                            />
                            <p className="text-[9px] text-muted-foreground/30">
                              Use {"{{nome}}"} para variáveis. Suporta **negrito** e listas.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {searchQuery && filtered.length === 0 && (
                <p className="text-xs text-muted-foreground/50 text-center py-4">Nenhum resultado para "{searchQuery}"</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm">Importar FAQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Cole várias perguntas e respostas no formato:
            </p>
            <div className="text-[11px] bg-muted/20 rounded-lg p-2.5 font-mono text-muted-foreground border border-border/20">
              Pergunta: Como funciona?<br />
              Resposta: Funciona assim...<br />
              Pergunta: Qual o prazo?<br />
              Resposta: O prazo é de 30 dias.
            </div>
            <Textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="Cole aqui..."
              className="min-h-[120px] text-sm font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowImport(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleImport} disabled={!importText.trim()}>
              <Upload className="h-3 w-3 mr-1.5" /> Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
