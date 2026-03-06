import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Trash2, Loader2, Send, Bot, User, Sparkles, BookOpen, Wrench, FlaskConical,
  ChevronRight, Check, FileText, LinkIcon, MessageSquare, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { AiAgent, AiAgentInsert } from "@/hooks/useAiAgents";

const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Rápido e econômico" },
  { value: "gpt-4o", label: "GPT-4o", desc: "Mais inteligente" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", desc: "Balanceado" },
  { value: "gpt-4.1", label: "GPT-4.1", desc: "Máxima qualidade" },
];

const TONES = [
  { value: "amigável e profissional", label: "Amigável e profissional" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "empático", label: "Empático" },
  { value: "direto", label: "Direto" },
];

const DEPARTMENTS = ["Salário-maternidade", "Financeiro", "Suporte", "Vendas", "Geral"];

const TOOLS_OPTIONS = [
  { key: "qualify_lead", label: "Qualificar lead", desc: "Coleta dados para qualificação", icon: User },
  { key: "apply_tags", label: "Aplicar etiquetas", desc: "Adiciona tags à conversa", icon: FileText },
  { key: "handoff_human", label: "Transbordo humano", desc: "Transfere para atendente", icon: MessageSquare },
  { key: "register_events", label: "Registrar eventos", desc: "Salva eventos no CRM", icon: Sparkles },
  { key: "schedule_followup", label: "Agendar follow-up", desc: "Cria lembrete de acompanhamento", icon: ChevronRight },
];

const TOKEN_PRESETS = [200, 300, 600];

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

const STEPS = [
  { id: "personality", label: "Personalidade", icon: Sparkles, num: 1 },
  { id: "knowledge", label: "Conhecimento", icon: BookOpen, num: 2 },
  { id: "tools", label: "Ferramentas", icon: Wrench, num: 3 },
  { id: "preview", label: "Teste", icon: FlaskConical, num: 4 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agent?: AiAgent | null;
  onSave: (data: Partial<AiAgentInsert>) => void;
  isSaving: boolean;
}

export function AgentFormDialog({ open, onOpenChange, agent, onSave, isSaving }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<StepId>("personality");

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
    if (!open) return;
    if (agent) {
      setName(agent.name);
      setModel(agent.model);
      setTone(agent.tone);
      setMaxTokens(agent.max_tokens);
      setDepartments(agent.departments ?? []);
      setSystemPrompt(agent.system_prompt ?? "");
      setKnowledgeInstructions(agent.knowledge_instructions ?? "");
      setKnowledgeFaq(agent.knowledge_faq ?? []);
      setKnowledgeLinks(agent.knowledge_links ?? []);
      setToolsConfig(agent.tools_config ?? {});
      setIsActive(agent.is_active);
    } else {
      setName(""); setModel("gpt-4o-mini"); setTone("amigável e profissional");
      setMaxTokens(300); setDepartments([]); setSystemPrompt("");
      setKnowledgeInstructions(""); setKnowledgeFaq([]); setKnowledgeLinks([]);
      setToolsConfig({}); setIsActive(true);
    }
    setStep("personality"); setPreviewInput(""); setPreviewMessages([]); setDeptSearch("");
  }, [agent, open]);

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      setStep("personality");
      return;
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
    const filled = PROMPT_TEMPLATE.replace("{nome_agente}", name || "Agente").replace("{tom}", tone);
    setSystemPrompt(filled);
  };

  const handlePreview = async () => {
    if (!previewInput.trim()) return;
    const userMsg = previewInput.trim();
    setPreviewMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setPreviewInput("");
    setPreviewLoading(true);
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
    } finally {
      setPreviewLoading(false);
    }
  };

  const filteredDepts = DEPARTMENTS.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase()));
  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden max-h-[92vh]" aria-describedby={undefined}>
        {/* ── Fixed Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{agent?.id ? "Editar Agente" : "Novo Agente IA"}</h2>
              <p className="text-xs text-muted-foreground">{name || "Sem nome"} · {MODELS.find(m => m.value === model)?.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {agent?.id ? "Salvar" : "Criar Agente"}
            </Button>
          </div>
        </div>

        {/* ── Step Navigation ── */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-border/20 bg-muted/20 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                step === s.id
                  ? "bg-primary/10 text-primary"
                  : i < currentStepIdx
                    ? "text-muted-foreground hover:bg-muted/30"
                    : "text-muted-foreground/60 hover:bg-muted/30"
              )}
            >
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0",
                step === s.id
                  ? "bg-primary text-primary-foreground"
                  : i < currentStepIdx
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              )}>
                {i < currentStepIdx ? <Check className="h-3 w-3" /> : s.num}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <ScrollArea className="flex-1 max-h-[calc(92vh-140px)]">
          <div className="p-6">

            {/* ═══ PERSONALITY ═══ */}
            {step === "personality" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Block: Identity */}
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">Identidade</h3>
                      <p className="text-xs text-muted-foreground">Nome e configuração básica do agente</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Nome do agente <span className="text-destructive">*</span></Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Emily" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Status</Label>
                        <div className="flex items-center justify-between h-10 px-3 rounded-md border border-input bg-background">
                          <span className="text-sm text-muted-foreground">{isActive ? "Ativo" : "Inativo"}</span>
                          <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                      </div>
                    </div>
                  </section>

                  <Separator className="bg-border/20" />

                  {/* Block: Model */}
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">Modelo de IA</h3>
                      <p className="text-xs text-muted-foreground">Escolha o modelo que melhor se adapta ao seu caso</p>
                    </div>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[100]">
                        {MODELS.map(m => (
                          <SelectItem key={m.value} value={m.value}>
                            <div className="flex items-center gap-2">
                              <span>{m.label}</span>
                              <span className="text-xs text-muted-foreground">· {m.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </section>

                  <Separator className="bg-border/20" />

                  {/* Block: Style */}
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">Estilo de conversa</h3>
                      <p className="text-xs text-muted-foreground">Tom e limite de resposta</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Tom</Label>
                        <Select value={tone} onValueChange={setTone}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[100]">
                            {TONES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Máx. tokens</Label>
                        <div className="flex gap-2">
                          {TOKEN_PRESETS.map(p => (
                            <button
                              key={p}
                              onClick={() => setMaxTokens(p)}
                              className={cn(
                                "flex-1 py-2 rounded-md text-xs font-medium border transition-all",
                                maxTokens === p
                                  ? "bg-primary/10 border-primary/30 text-primary"
                                  : "border-input text-muted-foreground hover:bg-muted/30"
                              )}
                            >
                              {p}
                            </button>
                          ))}
                          <Input
                            type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))}
                            min={50} max={4000} className="w-20 text-center text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <Separator className="bg-border/20" />

                  {/* Block: Scope */}
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">Escopo de atuação</h3>
                      <p className="text-xs text-muted-foreground">Define onde esse agente pode atuar</p>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={deptSearch} onChange={e => setDeptSearch(e.target.value)}
                        placeholder="Buscar departamento..."
                        className="text-sm"
                      />
                      {departments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {departments.map(d => (
                            <Badge key={d} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
                              {d}
                              <button onClick={() => toggleDepartment(d)} className="hover:bg-muted rounded-full p-0.5">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {filteredDepts.filter(d => !departments.includes(d)).map(d => (
                          <Badge key={d} variant="outline" className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => toggleDepartment(d)}>
                            <Plus className="h-3 w-3 mr-1" />{d}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </section>

                  <Separator className="bg-border/20" />

                  {/* Block: System Prompt */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">Prompt do sistema</h3>
                        <p className="text-xs text-muted-foreground">Personalidade, regras e comportamento. Converse naturalmente, sem checklist.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={insertPromptTemplate} className="shrink-0 text-xs">
                        <FileText className="h-3.5 w-3.5 mr-1.5" /> Inserir template
                      </Button>
                    </div>
                    <div className="relative">
                      <Textarea
                        value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                        placeholder="Descreva a personalidade, objetivos, regras e tom de voz do agente..."
                        className="min-h-[180px] text-sm font-mono leading-relaxed resize-y"
                      />
                      <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/40">
                        {systemPrompt.length} caracteres
                      </div>
                    </div>
                  </section>
                </div>

                {/* ── Preview Card (right column) ── */}
                <div className="hidden lg:block">
                  <div className="sticky top-0 space-y-4">
                    <Card className="overflow-hidden">
                      <div className="bg-primary/5 p-4 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                          <Bot className="h-8 w-8 text-primary" />
                        </div>
                        <p className="font-semibold text-sm">{name || "Agente IA"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{MODELS.find(m => m.value === model)?.label}</p>
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          <div className={cn("h-2 w-2 rounded-full", isActive ? "bg-primary" : "bg-muted-foreground/30")} />
                          <span className="text-[11px] text-muted-foreground">{isActive ? "Ativo" : "Inativo"}</span>
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="text-xs space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tom</span>
                            <span className="font-medium capitalize">{tone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tokens</span>
                            <span className="font-medium">{maxTokens}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Departamentos</span>
                            <span className="font-medium">{departments.length || "—"}</span>
                          </div>
                        </div>
                        <Separator className="bg-border/20" />
                        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setStep("preview")}>
                          <FlaskConical className="h-3.5 w-3.5 mr-1.5" /> Testar agente
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ KNOWLEDGE ═══ */}
            {step === "knowledge" && (
              <div className="space-y-6 max-w-2xl">
                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Instruções de conhecimento</h3>
                    <p className="text-xs text-muted-foreground">O que o agente deve saber e como deve responder sobre temas específicos</p>
                  </div>
                  <Textarea
                    value={knowledgeInstructions} onChange={e => setKnowledgeInstructions(e.target.value)}
                    placeholder="Ex: Somos uma empresa de assessoria previdenciária. Nosso serviço principal é o salário-maternidade..."
                    className="min-h-[120px] text-sm"
                  />
                </section>

                <Separator className="bg-border/20" />

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Perguntas e Respostas</h3>
                      <p className="text-xs text-muted-foreground">FAQ que o agente usará para responder</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={addFaq} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {knowledgeFaq.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border/40 rounded-xl">
                      <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="text-xs text-muted-foreground">Nenhuma pergunta cadastrada</p>
                      <Button size="sm" variant="ghost" onClick={addFaq} className="mt-2 text-xs">
                        <Plus className="h-3 w-3 mr-1" /> Criar primeira pergunta
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {knowledgeFaq.map((faq, i) => (
                        <Card key={i} className="overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 border-b border-border/20">
                              <span className="text-[10px] font-semibold text-muted-foreground">Q{i + 1}</span>
                              <Input
                                value={faq.question} onChange={e => updateFaq(i, "question", e.target.value)}
                                placeholder="Pergunta..." className="text-sm border-0 bg-transparent p-0 h-auto focus-visible:ring-0 shadow-none"
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive" onClick={() => removeFaq(i)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="px-3 py-2">
                              <Textarea
                                value={faq.answer} onChange={e => updateFaq(i, "answer", e.target.value)}
                                placeholder="Resposta..." className="min-h-[50px] text-sm border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none resize-none"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>

                <Separator className="bg-border/20" />

                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5" /> Links de consulta
                    </h3>
                    <p className="text-xs text-muted-foreground">Até 5 URLs para o agente consultar</p>
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: Math.min(knowledgeLinks.length + 1, 5) }).map((_, i) => (
                      <Input
                        key={i}
                        value={knowledgeLinks[i] ?? ""}
                        onChange={e => {
                          const newLinks = [...knowledgeLinks];
                          newLinks[i] = e.target.value;
                          setKnowledgeLinks(newLinks.filter((_, idx) => idx <= i || newLinks[idx]));
                        }}
                        placeholder={`https://exemplo.com/artigo-${i + 1}`}
                        className="text-sm"
                      />
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ═══ TOOLS ═══ */}
            {step === "tools" && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="text-sm font-semibold">Ferramentas do agente</h3>
                  <p className="text-xs text-muted-foreground">Habilite ações que o agente pode executar automaticamente</p>
                </div>
                <div className="space-y-2">
                  {TOOLS_OPTIONS.map(tool => (
                    <div
                      key={tool.key}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                        toolsConfig[tool.key]
                          ? "border-primary/20 bg-primary/5"
                          : "border-border/30 hover:border-border/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                          toolsConfig[tool.key] ? "bg-primary/10" : "bg-muted/40"
                        )}>
                          <tool.icon className={cn("h-4 w-4", toolsConfig[tool.key] ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tool.label}</p>
                          <p className="text-xs text-muted-foreground">{tool.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={toolsConfig[tool.key] ?? false}
                        onCheckedChange={v => setToolsConfig(prev => ({ ...prev, [tool.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ TEST / PREVIEW ═══ */}
            {step === "preview" && (
              <div className="max-w-2xl space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Testar agente</h3>
                  <p className="text-xs text-muted-foreground">Simule uma conversa para validar o comportamento (sem enviar no WhatsApp)</p>
                </div>

                {/* Chat area */}
                <Card className="overflow-hidden">
                  <div className="bg-muted/20 px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium">{name || "Agente"}</span>
                    <span className="text-[10px] text-muted-foreground">· {MODELS.find(m => m.value === model)?.label} · {maxTokens} tokens</span>
                  </div>
                  <div className="min-h-[280px] max-h-[400px] overflow-y-auto p-4 space-y-3">
                    {previewMessages.length === 0 && (
                      <div className="text-center py-12">
                        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/15 mb-3" />
                        <p className="text-xs text-muted-foreground/50">Envie uma mensagem para testar</p>
                      </div>
                    )}
                    {previewMessages.map((msg, i) => (
                      <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted/40 rounded-bl-md"
                        )}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {previewLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted/40 px-4 py-3 rounded-2xl rounded-bl-md">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 bg-muted-foreground/30 rounded-full animate-bounce [animation-delay:0ms]" />
                            <div className="h-2 w-2 bg-muted-foreground/30 rounded-full animate-bounce [animation-delay:150ms]" />
                            <div className="h-2 w-2 bg-muted-foreground/30 rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border/20 p-3 flex gap-2">
                    <Input
                      value={previewInput} onChange={e => setPreviewInput(e.target.value)}
                      placeholder="Mensagem de teste..." className="text-sm"
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePreview(); } }}
                    />
                    <Button size="icon" onClick={handlePreview} disabled={previewLoading || !previewInput.trim()}>
                      {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </Card>

                {previewMessages.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPreviewMessages([])}>
                    Limpar conversa
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
