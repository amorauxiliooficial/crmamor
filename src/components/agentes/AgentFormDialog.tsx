import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Plus, Trash2, Loader2, Send, Bot, Sparkles, BookOpen, Wrench, FlaskConical,
  Check, FileText, LinkIcon, MessageSquare, X, Clock,
  Search, RotateCcw, Zap, Tag, ArrowRightLeft, CalendarClock, Users, ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AiAgent, AiAgentInsert } from "@/hooks/useAiAgents";

/* ── Constants ── */
const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Rápido e econômico — ideal para volume alto" },
  { value: "gpt-4o", label: "GPT-4o", desc: "Forte em raciocínio e contexto longo" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", desc: "Balanceado entre custo e qualidade" },
  { value: "gpt-4.1", label: "GPT-4.1", desc: "Máxima qualidade e precisão" },
];

const TONES = [
  { value: "amigável e profissional", label: "Amigável", emoji: "😊" },
  { value: "formal", label: "Formal", emoji: "👔" },
  { value: "casual", label: "Casual", emoji: "✌️" },
  { value: "empático", label: "Empático", emoji: "💛" },
  { value: "direto", label: "Direto", emoji: "🎯" },
];

const DEPARTMENTS = ["Salário-maternidade", "Financeiro", "Suporte", "Vendas", "Geral"];

const TOOLS_OPTIONS = [
  { key: "qualify_lead", label: "Qualificar lead", desc: "Coleta dados para qualificação automática", icon: Zap },
  { key: "apply_tags", label: "Aplicar etiquetas", desc: "Adiciona tags à conversa automaticamente", icon: Tag },
  { key: "handoff_human", label: "Transbordo humano", desc: "Transfere para atendente quando necessário", icon: ArrowRightLeft },
  { key: "register_events", label: "Registrar eventos", desc: "Salva eventos no CRM automaticamente", icon: Sparkles },
  { key: "schedule_followup", label: "Agendar follow-up", desc: "Cria lembrete de acompanhamento", icon: CalendarClock },
];

const TOKEN_PRESETS = [200, 300, 600, 1000];

const PROMPT_TEMPLATE = `Você é {nome_agente}, assistente virtual da empresa.

## Objetivos
- Responder dúvidas dos clientes de forma natural e empática
- Coletar informações quando necessário
- Encaminhar para um humano quando não souber responder

## Regras
- Nunca invente informações
- Use linguagem {tom}
- Mantenha respostas curtas e objetivas
- Não use checklist ou listas numeradas excessivas

## Tom de voz
Converse de forma natural, como se estivesse em uma conversa real.

## Exemplos
Cliente: "Quero saber sobre o processo"
Agente: "Claro! Posso te ajudar com isso. Qual é a sua principal dúvida?"`;

type TabId = "personality" | "knowledge" | "tools" | "preview";

/* ═══════════════════════════════════════════════════════
   AgentFormPanel — the actual form, usable inline or in dialog
   ═══════════════════════════════════════════════════════ */

interface PanelProps {
  agent?: AiAgent | null;
  onSave: (data: Partial<AiAgentInsert>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function AgentFormPanel({ agent, onSave, onCancel, isSaving }: PanelProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabId>("personality");

  const [name, setName] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [tone, setTone] = useState("amigável e profissional");
  const [maxTokens, setMaxTokens] = useState(300);
  const [departments, setDepartments] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [knowledgeInstructions, setKnowledgeInstructions] = useState("");
  const [knowledgeFaq, setKnowledgeFaq] = useState<{ question: string; answer: string }[]>([]);
  const [knowledgeLinks, setKnowledgeLinks] = useState<string[]>([]);
  const [toolsConfig, setToolsConfig] = useState<Record<string, boolean>>({});
  const [isActive, setIsActive] = useState(true);
  const [deptSearch, setDeptSearch] = useState("");

  const [previewInput, setPreviewInput] = useState("");
  const [previewMessages, setPreviewMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.name); setModel(agent.model); setTone(agent.tone);
      setMaxTokens(agent.max_tokens); setDepartments(agent.departments ?? []);
      setSystemPrompt(agent.system_prompt ?? "");
      setKnowledgeInstructions(agent.knowledge_instructions ?? "");
      setKnowledgeFaq(agent.knowledge_faq ?? []);
      setKnowledgeLinks(agent.knowledge_links ?? []);
      setToolsConfig(agent.tools_config ?? {}); setIsActive(agent.is_active);
    } else {
      setName(""); setModel("gpt-4o-mini"); setTone("amigável e profissional");
      setMaxTokens(300); setDepartments([]); setSystemPrompt("");
      setKnowledgeInstructions(""); setKnowledgeFaq([]); setKnowledgeLinks([]);
      setToolsConfig({}); setIsActive(true);
    }
    setTab("personality"); setPreviewInput(""); setPreviewMessages([]); setDeptSearch("");
  }, [agent]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [previewMessages, previewLoading]);

  const personalityComplete = !!name.trim() && !!systemPrompt.trim();
  const knowledgeComplete = !!knowledgeInstructions.trim() || knowledgeFaq.length > 0;
  const toolsComplete = Object.values(toolsConfig).some(Boolean);

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" }); setTab("personality"); return;
    }
    onSave({
      name: name.trim(), model, tone, max_tokens: maxTokens, departments,
      system_prompt: systemPrompt, knowledge_instructions: knowledgeInstructions,
      knowledge_faq: knowledgeFaq, knowledge_links: knowledgeLinks.filter(Boolean),
      tools_config: toolsConfig, is_active: isActive,
    });
  };

  const toggleDepartment = (d: string) => {
    setDepartments(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };
  const addFaq = () => setKnowledgeFaq(prev => [...prev, { question: "", answer: "" }]);
  const removeFaq = (i: number) => setKnowledgeFaq(prev => prev.filter((_, idx) => idx !== i));
  const updateFaq = (i: number, field: "question" | "answer", val: string) => {
    setKnowledgeFaq(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  };
  const insertPromptTemplate = () => {
    setSystemPrompt(PROMPT_TEMPLATE.replace("{nome_agente}", name || "Agente").replace("{tom}", tone));
  };

  const handlePreview = async () => {
    if (!previewInput.trim()) return;
    const userMsg = previewInput.trim();
    setPreviewMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setPreviewInput(""); setPreviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wa-ai-reply", {
        body: {
          preview_mode: true, preview_message: userMsg,
          agent_config: { name, model, tone, max_tokens: maxTokens, system_prompt: systemPrompt, knowledge_instructions: knowledgeInstructions, knowledge_faq: knowledgeFaq },
        },
      });
      if (error) throw error;
      setPreviewMessages(prev => [...prev, { role: "assistant", text: data?.reply || data?.error || "Sem resposta" }]);
    } catch (err: any) {
      setPreviewMessages(prev => [...prev, { role: "assistant", text: `Erro: ${err.message}` }]);
    } finally { setPreviewLoading(false); }
  };

  const filteredDepts = DEPARTMENTS.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase()));

  const TABS = [
    { id: "personality" as const, label: "Personalidade", icon: Sparkles, complete: personalityComplete },
    { id: "knowledge" as const, label: "Conhecimento", icon: BookOpen, complete: knowledgeComplete },
    { id: "tools" as const, label: "Ferramentas", icon: Wrench, complete: toolsComplete },
    { id: "preview" as const, label: "Teste", icon: FlaskConical, complete: previewMessages.length > 0 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ═══ HEADER ═══ */}
      <div className="shrink-0 border-b border-border/30 bg-card">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onCancel}>
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome do agente..."
              className="bg-transparent text-base font-semibold w-full outline-none placeholder:text-muted-foreground/40 truncate"
            />
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={isActive ? "default" : "outline"} className="text-[10px] px-1.5 py-0 h-4">
                {isActive ? "Ativo" : "Rascunho"}
              </Badge>
              {agent?.updated_at && (
                <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(agent.updated_at).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {agent?.id ? "Salvar" : "Publicar"}
            </Button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex items-center gap-0.5 px-4 sm:px-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", t.complete ? "bg-primary" : "bg-muted-foreground/20")} />
              {tab === t.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6">

          {/* PERSONALITY */}
          {tab === "personality" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-5">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> Identidade</CardTitle>
                    <CardDescription className="text-xs">Como o agente se apresenta</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-lg font-bold text-primary">
                        {name ? name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome <span className="text-destructive">*</span></Label>
                          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Emily" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Modelo e comportamento</CardTitle>
                    <CardDescription className="text-xs">Escolha o modelo e defina o estilo</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Modelo de IA</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[100]">
                          {MODELS.map(m => (
                            <SelectItem key={m.value} value={m.value}>
                              <span className="font-medium">{m.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">— {m.desc}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tom de conversa</Label>
                      <div className="flex flex-wrap gap-2">
                        {TONES.map(t => (
                          <button key={t.value} onClick={() => setTone(t.value)} className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                            tone === t.value ? "bg-primary/10 border-primary/30 text-primary" : "border-border/40 text-muted-foreground hover:border-border hover:bg-muted/20"
                          )}>{t.emoji} {t.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Máx. tokens</Label>
                        <span className="text-xs font-mono text-muted-foreground">{maxTokens}</span>
                      </div>
                      <Slider value={[maxTokens]} onValueChange={([v]) => setMaxTokens(v)} min={50} max={2000} step={50} />
                      <div className="flex gap-1.5">
                        {TOKEN_PRESETS.map(p => (
                          <button key={p} onClick={() => setMaxTokens(p)} className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all",
                            maxTokens === p ? "bg-primary/10 border-primary/30 text-primary" : "border-border/30 text-muted-foreground hover:bg-muted/20"
                          )}>{p}</button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Escopo de atuação</CardTitle>
                    <CardDescription className="text-xs">Define onde o agente atua</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                      <Input value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="Buscar departamento..." className="pl-9 text-sm" />
                    </div>
                    {departments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/20">
                        {departments.map(d => (
                          <Badge key={d} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 text-xs">
                            {d}
                            <button onClick={() => toggleDepartment(d)} className="hover:bg-muted rounded-full p-0.5"><X className="h-2.5 w-2.5" /></button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {filteredDepts.filter(d => !departments.includes(d)).map(d => (
                        <button key={d} onClick={() => toggleDepartment(d)} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border border-dashed border-border/40 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all">
                          <Plus className="h-3 w-3" />{d}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Prompt do sistema</CardTitle>
                        <CardDescription className="text-xs mt-0.5">Personalidade, regras e comportamento</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={insertPromptTemplate} className="text-xs shrink-0">
                        <FileText className="h-3 w-3 mr-1" /> Template
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <Textarea
                        value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                        placeholder={"Descreva a personalidade do agente...\n\n## Objetivos\n- ...\n\n## Regras\n- ..."}
                        className="min-h-[200px] text-sm font-mono leading-relaxed resize-y"
                      />
                      <div className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground/30 font-mono">{systemPrompt.length} chars</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {!isMobile && (
                <div className="lg:col-span-2">
                  <div className="sticky top-0">
                    <SimulatorPanel
                      name={name} model={model} maxTokens={maxTokens} tone={tone}
                      messages={previewMessages} loading={previewLoading}
                      input={previewInput} setInput={setPreviewInput}
                      onSend={handlePreview} onClear={() => setPreviewMessages([])}
                      chatEndRef={chatEndRef}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* KNOWLEDGE */}
          {tab === "knowledge" && (
            <div className="max-w-2xl mx-auto space-y-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Instruções</CardTitle>
                  <CardDescription className="text-xs">O que o agente deve saber sobre a empresa</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea value={knowledgeInstructions} onChange={e => setKnowledgeInstructions(e.target.value)}
                    placeholder="Ex: Somos uma empresa de assessoria previdenciária..." className="min-h-[120px] text-sm" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div><CardTitle className="text-sm">Perguntas e Respostas</CardTitle><CardDescription className="text-xs">FAQ do agente</CardDescription></div>
                    <Button size="sm" variant="outline" onClick={addFaq} className="text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {knowledgeFaq.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border/30 rounded-xl">
                      <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/15 mb-2" />
                      <p className="text-xs text-muted-foreground/50">Nenhuma pergunta cadastrada</p>
                      <Button size="sm" variant="ghost" onClick={addFaq} className="mt-2 text-xs"><Plus className="h-3 w-3 mr-1" /> Criar primeira</Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {knowledgeFaq.map((faq, i) => (
                        <div key={i} className="rounded-lg border border-border/30 overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted/15 border-b border-border/20">
                            <span className="text-[10px] font-bold text-primary/60">Q{i + 1}</span>
                            <Input value={faq.question} onChange={e => updateFaq(i, "question", e.target.value)} placeholder="Pergunta..." className="text-sm border-0 bg-transparent p-0 h-auto focus-visible:ring-0 shadow-none font-medium" />
                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground/40 hover:text-destructive" onClick={() => removeFaq(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                          <div className="px-3 py-2.5">
                            <Textarea value={faq.answer} onChange={e => updateFaq(i, "answer", e.target.value)} placeholder="Resposta..." className="min-h-[50px] text-sm border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none resize-none" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><LinkIcon className="h-4 w-4 text-primary" /> Links de consulta</CardTitle>
                  <CardDescription className="text-xs">Até 5 URLs de referência</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Array.from({ length: Math.min(knowledgeLinks.length + 1, 5) }).map((_, i) => (
                    <Input key={i} value={knowledgeLinks[i] ?? ""} onChange={e => {
                      const nl = [...knowledgeLinks]; nl[i] = e.target.value;
                      setKnowledgeLinks(nl.filter((_, idx) => idx <= i || nl[idx]));
                    }} placeholder={`https://exemplo.com/artigo-${i + 1}`} className="text-sm" />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TOOLS */}
          {tab === "tools" && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="mb-1">
                <h3 className="text-sm font-semibold">Ferramentas do agente</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ações executadas automaticamente</p>
              </div>
              <div className="space-y-2.5">
                {TOOLS_OPTIONS.map(tool => (
                  <div key={tool.key} onClick={() => setToolsConfig(prev => ({ ...prev, [tool.key]: !prev[tool.key] }))} className={cn(
                    "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                    toolsConfig[tool.key] ? "border-primary/20 bg-primary/5 shadow-sm" : "border-border/30 hover:border-border/60 hover:bg-muted/10"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", toolsConfig[tool.key] ? "bg-primary/10" : "bg-muted/30")}>
                        <tool.icon className={cn("h-4 w-4", toolsConfig[tool.key] ? "text-primary" : "text-muted-foreground/60")} />
                      </div>
                      <div><p className="text-sm font-medium">{tool.label}</p><p className="text-xs text-muted-foreground/70">{tool.desc}</p></div>
                    </div>
                    <Switch checked={toolsConfig[tool.key] ?? false} onCheckedChange={v => setToolsConfig(prev => ({ ...prev, [tool.key]: v }))} onClick={e => e.stopPropagation()} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TEST */}
          {tab === "preview" && (
            <div className="max-w-2xl mx-auto">
              <SimulatorPanel
                name={name} model={model} maxTokens={maxTokens} tone={tone}
                messages={previewMessages} loading={previewLoading}
                input={previewInput} setInput={setPreviewInput}
                onSend={handlePreview} onClear={() => setPreviewMessages([])}
                chatEndRef={chatEndRef} fullWidth
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AgentFormDialog — thin wrapper for backward compat
   ═══════════════════════════════════════════════════════ */

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agent?: AiAgent | null;
  onSave: (data: Partial<AiAgentInsert>) => void;
  isSaving: boolean;
}

export function AgentFormDialog({ open, onOpenChange, agent, onSave, isSaving }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden max-h-[94vh] flex flex-col" aria-describedby={undefined}>
        <AgentFormPanel agent={agent} onSave={onSave} onCancel={() => onOpenChange(false)} isSaving={isSaving} />
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   SIMULATOR PANEL
   ═══════════════════════════════════════════════════════ */

function SimulatorPanel({ name, model, maxTokens, tone, messages, loading, input, setInput, onSend, onClear, chatEndRef, fullWidth }: {
  name: string; model: string; maxTokens: number; tone: string;
  messages: { role: "user" | "assistant"; text: string }[];
  loading: boolean; input: string; setInput: (v: string) => void;
  onSend: () => void; onClear: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  fullWidth?: boolean;
}) {
  const modelLabel = MODELS.find(m => m.value === model)?.label ?? model;

  return (
    <Card className={cn("overflow-hidden flex flex-col", fullWidth ? "min-h-[500px]" : "h-[560px]")}>
      <div className="shrink-0 px-4 py-3 border-b border-border/20 bg-muted/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
          <div><p className="text-xs font-semibold leading-none">{name || "Agente"}</p><p className="text-[10px] text-muted-foreground mt-0.5">{modelLabel} · {maxTokens} tokens</p></div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-[10px] text-muted-foreground"><RotateCcw className="h-3 w-3 mr-1" /> Limpar</Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="text-center pt-16 pb-8">
            <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3"><MessageSquare className="h-7 w-7 text-primary/20" /></div>
            <p className="text-xs text-muted-foreground/40 font-medium">Simulador de conversa</p>
            <p className="text-[11px] text-muted-foreground/30 mt-1">Envie uma mensagem para testar o agente</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0"><Bot className="h-3 w-3 text-primary" /></div>
            )}
            <div className={cn(
              "max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed",
              msg.role === "user" ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md" : "bg-muted/30 rounded-2xl rounded-bl-md"
            )}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0"><Bot className="h-3 w-3 text-primary" /></div>
            <div className="bg-muted/30 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 bg-muted-foreground/30 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="h-1.5 w-1.5 bg-muted-foreground/30 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 bg-muted-foreground/30 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 border-t border-border/20 p-3 flex gap-2 bg-background">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Digite uma mensagem..." className="text-sm"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} />
        <Button size="icon" onClick={onSend} disabled={loading || !input.trim()} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}
