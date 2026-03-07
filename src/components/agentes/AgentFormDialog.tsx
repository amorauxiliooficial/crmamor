import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus, Trash2, Loader2, Send, Bot, Sparkles, BookOpen, Wrench, FlaskConical,
  FileText, LinkIcon, MessageSquare, X, Clock,
  Search, RotateCcw, Zap, Tag, ArrowRightLeft, CalendarClock, Users, ArrowLeft,
  AlertCircle, CheckCircle2, Rocket, ChevronDown, Circle, MoreHorizontal, Copy,
  Maximize2, Minimize2, Settings2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebouncedCallback } from "use-debounce";
import type { AiAgent, AiAgentInsert } from "@/hooks/useAiAgents";
import { FaqEditor } from "@/components/agentes/FaqEditor";

/* ── Constants ── */
const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Rápido e econômico" },
  { value: "gpt-4o", label: "GPT-4o", desc: "Raciocínio forte" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", desc: "Custo × qualidade" },
  { value: "gpt-4.1", label: "GPT-4.1", desc: "Máxima precisão" },
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
  { key: "qualify_lead", label: "Qualificar lead", desc: "Coleta dados para qualificação automática", icon: Zap, configFields: [
    { key: "qualify_fields", label: "Campos a coletar", placeholder: "nome, tipo_evento, data_evento, situacao_trabalhista" },
  ] },
  { key: "apply_tags", label: "Aplicar etiquetas", desc: "Adiciona tags à conversa automaticamente", icon: Tag, configFields: [
    { key: "auto_tags", label: "Tags sugeridas", placeholder: "interessada, qualificada, prioridade" },
  ] },
  { key: "handoff_human", label: "Transbordo humano", desc: "Transfere para atendente quando necessário", icon: ArrowRightLeft, configFields: [
    { key: "handoff_message", label: "Mensagem de transbordo", placeholder: "Vou te encaminhar para um atendente..." },
  ] },
  { key: "register_events", label: "Registrar eventos", desc: "Salva eventos no CRM automaticamente", icon: Sparkles, configFields: [] },
  { key: "schedule_followup", label: "Agendar follow-up", desc: "Cria lembrete de acompanhamento", icon: CalendarClock, configFields: [
    { key: "followup_default_days", label: "Dias padrão para follow-up", placeholder: "3" },
  ] },
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
Converse de forma natural, como se estivesse em uma conversa real.`;

type TabId = "personality" | "knowledge" | "tools" | "preview";

/* ── Validation ── */
function validateAgent(data: {
  name: string; systemPrompt: string; knowledgeFaq: { question: string; answer: string }[];
  knowledgeLinks: string[];
}): { valid: boolean; errors: { tab: TabId; msg: string }[] } {
  const errors: { tab: TabId; msg: string }[] = [];
  if (!data.name.trim()) errors.push({ tab: "personality", msg: "Nome do agente é obrigatório" });
  if (!data.systemPrompt.trim()) errors.push({ tab: "personality", msg: "Prompt do sistema é obrigatório" });
  if (data.knowledgeFaq.some(f => (f.question && !f.answer) || (!f.question && f.answer))) {
    errors.push({ tab: "knowledge", msg: "FAQ incompleto: preencha pergunta e resposta" });
  }
  if (data.knowledgeLinks.filter(Boolean).length > 5) {
    errors.push({ tab: "knowledge", msg: "Máximo de 5 links de referência" });
  }
  return { valid: errors.length === 0, errors };
}

/* ── Collect form data helper ── */
function collectFormData(state: {
  name: string; model: string; tone: string; maxTokens: number; departments: string[];
  systemPrompt: string; knowledgeInstructions: string;
  knowledgeFaq: { question: string; answer: string }[]; knowledgeLinks: string[];
  toolsConfig: Record<string, any>; isActive: boolean;
}): Partial<AiAgentInsert> {
  return {
    name: state.name.trim(), model: state.model, tone: state.tone, max_tokens: state.maxTokens,
    departments: state.departments, system_prompt: state.systemPrompt,
    knowledge_instructions: state.knowledgeInstructions, knowledge_faq: state.knowledgeFaq,
    knowledge_links: state.knowledgeLinks.filter(Boolean),
    tools_config: state.toolsConfig, is_active: state.isActive,
  };
}

/* ═══════════════════════════════════════════════════════
   AgentFormPanel
   ═══════════════════════════════════════════════════════ */

interface PanelProps {
  agent?: AiAgent | null;
  onSave: (data: Partial<AiAgentInsert>) => void;
  onPublish?: (agentId: string) => void;
  onDuplicate?: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isPublishing?: boolean;
}

export function AgentFormPanel({ agent, onSave, onPublish, onDuplicate, onCancel, isSaving, isPublishing }: PanelProps) {
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
  const [toolsConfig, setToolsConfig] = useState<Record<string, any>>({});
  const [isActive, setIsActive] = useState(true);
  const [deptSearch, setDeptSearch] = useState("");
  const [promptExpanded, setPromptExpanded] = useState(false);

  const [previewInput, setPreviewInput] = useState("");
  const [previewMessages, setPreviewMessages] = useState<{ role: "user" | "assistant"; text: string; meta?: any }[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ tab: TabId; msg: string }[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // ── Track agent identity to avoid resetting tab on autosave ──
  const prevAgentIdRef = useRef<string | null>(null);

  // ── Initialize from agent ──
  useEffect(() => {
    const isNewAgent = (agent?.id ?? null) !== prevAgentIdRef.current;
    prevAgentIdRef.current = agent?.id ?? null;

    // Only reset all fields when switching to a different agent or loading for first time
    // Skip resetting when it's just an autosave-triggered update (same agent, dirty state was just cleared)
    if (isNewAgent) {
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
      setTab("personality"); setPreviewInput(""); setPreviewMessages([]);
      setDeptSearch(""); setValidationErrors([]);
    }
    // Always update the saved timestamp
    setLastSavedAt(agent?.updated_at ? new Date(agent.updated_at) : null);
  }, [agent]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [previewMessages, previewLoading]);

  // ── Mark dirty on changes ──
  const markDirty = useCallback(() => setIsDirty(true), []);

  // ── Autosave (debounced 3s, only for existing agents) ──
  const debouncedAutoSave = useDebouncedCallback(() => {
    if (!agent?.id || !name.trim() || isSaving) return;
    const data = collectFormData({ name, model, tone, maxTokens, departments, systemPrompt, knowledgeInstructions, knowledgeFaq, knowledgeLinks, toolsConfig, isActive });
    onSave(data);
    setIsDirty(false);
    setLastSavedAt(new Date());
  }, 3000);

  useEffect(() => {
    if (isDirty && agent?.id) debouncedAutoSave();
  }, [isDirty, agent?.id]);

  // ── Completeness ──
  const personalityComplete = !!name.trim() && !!systemPrompt.trim();
  const knowledgeComplete = !!knowledgeInstructions.trim() || knowledgeFaq.length > 0;
  const toolsComplete = Object.entries(toolsConfig).some(([_, v]) => v === true || (typeof v === "object" && v?.enabled));

  const isPublished = !!agent?.published_at;

  // ── Handlers ──
  const handleSave = () => {
    if (!name.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); setTab("personality"); return; }
    setValidationErrors([]);
    onSave(collectFormData({ name, model, tone, maxTokens, departments, systemPrompt, knowledgeInstructions, knowledgeFaq, knowledgeLinks, toolsConfig, isActive }));
    setIsDirty(false); setLastSavedAt(new Date());
  };

  const handlePublish = () => {
    const result = validateAgent({ name, systemPrompt, knowledgeFaq, knowledgeLinks: knowledgeLinks.filter(Boolean) });
    if (!result.valid) {
      setValidationErrors(result.errors);
      setTab(result.errors[0].tab); // Go to first error tab
      toast({ title: "Corrija os erros antes de publicar", description: result.errors.map(e => e.msg).join(", "), variant: "destructive" });
      return;
    }
    setValidationErrors([]);
    if (agent?.id && onPublish) {
      onSave(collectFormData({ name, model, tone, maxTokens, departments, systemPrompt, knowledgeInstructions, knowledgeFaq, knowledgeLinks, toolsConfig, isActive }));
    } else {
      toast({ title: "Salve o agente primeiro", variant: "destructive" });
    }
  };

  const setField = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (val: T | ((prev: T) => T)) => {
    setter(val); markDirty();
  };

  const toggleDepartment = (d: string) => { setDepartments(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]); markDirty(); };
  const insertPromptTemplate = () => {
    setSystemPrompt(PROMPT_TEMPLATE.replace("{nome_agente}", name || "Agente").replace("{tom}", tone)); markDirty();
  };

  const updateToolConfig = (toolKey: string, configKey: string, value: string) => {
    setToolsConfig(prev => ({ ...prev, [`${toolKey}_${configKey}`]: value })); markDirty();
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
          agent_config: { name, model, tone, max_tokens: maxTokens, system_prompt: systemPrompt, knowledge_instructions: knowledgeInstructions, knowledge_faq: knowledgeFaq, tools_config: toolsConfig },
        },
      });
      if (error) throw error;
      setPreviewMessages(prev => [...prev, {
        role: "assistant", text: data?.reply || data?.error || "Sem resposta",
        meta: { model: data?.model, tokens: data?.tokens, latency_ms: data?.latency_ms, tool_actions: data?.tool_actions },
      }]);
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

  const tabErrors = (tabId: TabId) => validationErrors.filter(e => e.tab === tabId);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ═══ STICKY HEADER ═══ */}
      <div className="shrink-0 border-b border-border/30 bg-card z-10">
        <div className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-6 sm:py-3 max-w-[100vw]">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <input
              value={name}
              onChange={e => { setName(e.target.value); markDirty(); }}
              placeholder="Nome do agente..."
              className="bg-transparent text-sm sm:text-base font-semibold w-full outline-none placeholder:text-muted-foreground/40 truncate"
            />
            <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
              {isPublished ? (
                <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 shrink-0">
                  <CheckCircle2 className="h-2.5 w-2.5" /> v{agent?.version || 1}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">Rascunho</Badge>
              )}
              {isDirty && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0 text-amber-500 border-amber-500/30">
                  <Circle className="h-1.5 w-1.5 fill-current" /> Não salvo
                </Badge>
              )}
              {!isDirty && lastSavedAt && (
                <span className="text-[9px] text-muted-foreground/40 flex items-center gap-0.5 shrink-0">
                  <Clock className="h-2.5 w-2.5" />
                  {lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden sm:flex items-center gap-1">
              <Switch checked={isActive} onCheckedChange={v => { setIsActive(v); markDirty(); }} />
            </div>
            <Button size="sm" variant="outline" onClick={handleSave} disabled={isSaving} className="h-8 text-xs px-2.5">
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
            </Button>
            {agent?.id && onPublish && (
              <Button size="sm" onClick={handlePublish} disabled={isPublishing || isSaving} className="h-8 text-xs px-2.5">
                {isPublishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Rocket className="h-3 w-3 mr-1" />Publicar</>}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100]">
                <DropdownMenuItem className="sm:hidden" onClick={() => { setIsActive(!isActive); markDirty(); }}>
                  {isActive ? "Desativar" : "Ativar"}
                </DropdownMenuItem>
                {onDuplicate && <DropdownMenuItem onClick={onDuplicate}><Copy className="h-3.5 w-3.5 mr-2" />Duplicar</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCancel} className="text-destructive">Descartar e sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="mx-3 sm:mx-6 mb-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
            <div className="text-[11px] text-destructive space-y-0.5">
              {validationErrors.map((e, i) => <p key={i}>{e.msg}</p>)}
            </div>
          </div>
        )}

        {/* Tab nav */}
        <div className="flex items-center gap-0 px-3 sm:px-6 overflow-x-auto scrollbar-none">
          {TABS.map(t => {
            const hasErr = tabErrors(t.id).length > 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                  tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                {hasErr ? (
                  <AlertCircle className="h-3 w-3 text-destructive" />
                ) : (
                  <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", t.complete ? "bg-primary" : "bg-muted-foreground/20")} />
                )}
                {tab === t.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-6 max-w-6xl mx-auto">

          {/* ── PERSONALITY ── */}
          {tab === "personality" && (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 sm:gap-6">
              <div className="min-w-0 space-y-4 sm:space-y-5">
                {/* Identity */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> Identidade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-lg font-bold text-primary">
                        {name ? name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs">Nome <span className="text-destructive">*</span></Label>
                        <Input value={name} onChange={e => { setName(e.target.value); markDirty(); }} placeholder="Ex: Emily" className="mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Model & Behavior */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Modelo e comportamento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Modelo de IA</Label>
                      <Select value={model} onValueChange={v => { setModel(v); markDirty(); }}>
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
                      <div className="flex flex-wrap gap-1.5">
                        {TONES.map(t => (
                          <button key={t.value} onClick={() => { setTone(t.value); markDirty(); }} className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                            tone === t.value ? "bg-primary/10 border-primary/30 text-primary" : "border-border/40 text-muted-foreground hover:border-border hover:bg-muted/20"
                          )}>{t.emoji} {t.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Máx. tokens</Label>
                        <span className="text-xs font-mono text-muted-foreground">{maxTokens}</span>
                      </div>
                      <Slider value={[maxTokens]} onValueChange={([v]) => { setMaxTokens(v); markDirty(); }} min={50} max={2000} step={50} />
                      <div className="flex gap-1">
                        {TOKEN_PRESETS.map(p => (
                          <button key={p} onClick={() => { setMaxTokens(p); markDirty(); }} className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium border transition-all",
                            maxTokens === p ? "bg-primary/10 border-primary/30 text-primary" : "border-border/30 text-muted-foreground hover:bg-muted/20"
                          )}>{p}</button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Scope */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Escopo de atuação</CardTitle>
                    <CardDescription className="text-xs">Define onde o agente atua</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                      <Input value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="Buscar departamento..." className="pl-8 text-sm h-8" />
                    </div>
                    {departments.length > 0 && (
                      <div className="flex flex-wrap gap-1 p-1.5 rounded-lg bg-muted/20 border border-border/20">
                        {departments.map(d => (
                          <Badge key={d} variant="secondary" className="gap-1 pl-2 pr-1 py-0 text-[11px]">
                            {d}
                            <button onClick={() => toggleDepartment(d)} className="hover:bg-muted rounded-full p-0.5"><X className="h-2.5 w-2.5" /></button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {filteredDepts.filter(d => !departments.includes(d)).map(d => (
                        <button key={d} onClick={() => toggleDepartment(d)} className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border border-dashed border-border/40 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all">
                          <Plus className="h-2.5 w-2.5" />{d}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* System Prompt */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Prompt do sistema <span className="text-destructive text-xs">*</span></CardTitle>
                        <CardDescription className="text-xs mt-0.5">Personalidade, regras e comportamento</CardDescription>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPromptExpanded(!promptExpanded)} title={promptExpanded ? "Recolher" : "Expandir"}>
                          {promptExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={insertPromptTemplate} className="text-[11px] h-7 px-2">
                          <FileText className="h-3 w-3 mr-1" /> Template
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <Textarea
                        value={systemPrompt} onChange={e => { setSystemPrompt(e.target.value); markDirty(); }}
                        placeholder={"Descreva a personalidade do agente...\n\n## Objetivos\n- ...\n\n## Regras\n- ..."}
                        className={cn(
                          "text-sm font-mono leading-relaxed resize-y transition-all",
                          promptExpanded ? "min-h-[400px] max-h-[600px]" : "min-h-[160px] max-h-[300px]"
                        )}
                      />
                      <div className="absolute bottom-2 right-3 text-[9px] text-muted-foreground/30 font-mono">{systemPrompt.length}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Simulator sidebar (desktop) */}
              {!isMobile && (
                <div className="min-w-0">
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

          {/* ── KNOWLEDGE ── */}
          {tab === "knowledge" && (
            <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Instruções</CardTitle>
                  <CardDescription className="text-xs">O que o agente deve saber sobre a empresa</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea value={knowledgeInstructions} onChange={e => { setKnowledgeInstructions(e.target.value); markDirty(); }}
                    placeholder="Ex: Somos uma empresa de assessoria previdenciária..." className="min-h-[100px] max-h-[250px] text-sm" />
                </CardContent>
              </Card>

              <FaqEditor
                value={knowledgeFaq}
                onChange={(faqs) => { setKnowledgeFaq(faqs); markDirty(); }}
              />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><LinkIcon className="h-4 w-4 text-primary" /> Links de consulta</CardTitle>
                  <CardDescription className="text-xs">Até 5 URLs de referência</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {Array.from({ length: Math.min(knowledgeLinks.length + 1, 5) }).map((_, i) => (
                    <Input key={i} value={knowledgeLinks[i] ?? ""} onChange={e => {
                      const nl = [...knowledgeLinks]; nl[i] = e.target.value;
                      setKnowledgeLinks(nl.filter((_, idx) => idx <= i || nl[idx])); markDirty();
                    }} placeholder={`https://exemplo.com/artigo-${i + 1}`} className="text-sm h-8" />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── TOOLS ── */}
          {tab === "tools" && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="mb-1">
                <h3 className="text-sm font-semibold">Ferramentas do agente</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ações executadas automaticamente durante a conversa</p>
              </div>
              <div className="space-y-2">
                {TOOLS_OPTIONS.map(tool => {
                  const isEnabled = toolsConfig[tool.key] === true;
                  return (
                    <div key={tool.key} className={cn(
                      "rounded-xl border transition-all overflow-hidden",
                      isEnabled ? "border-primary/20 bg-primary/5 shadow-sm" : "border-border/30"
                    )}>
                      <div
                        onClick={() => { setToolsConfig(prev => ({ ...prev, [tool.key]: !prev[tool.key] })); markDirty(); }}
                        className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors", isEnabled ? "bg-primary/10" : "bg-muted/30")}>
                            <tool.icon className={cn("h-4 w-4", isEnabled ? "text-primary" : "text-muted-foreground/60")} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{tool.label}</p>
                            <p className="text-[11px] text-muted-foreground/70 truncate">{tool.desc}</p>
                          </div>
                        </div>
                        <Switch checked={isEnabled} onCheckedChange={v => { setToolsConfig(prev => ({ ...prev, [tool.key]: v })); markDirty(); }} onClick={e => e.stopPropagation()} />
                      </div>

                      {/* Inline config panel */}
                      {isEnabled && tool.configFields.length > 0 && (
                        <div className="border-t border-border/20 px-3 sm:px-4 py-3 bg-muted/5 space-y-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                            <Settings2 className="h-3 w-3" /> Configuração
                          </div>
                          {tool.configFields.map(cf => (
                            <div key={cf.key} className="space-y-1">
                              <Label className="text-[11px]">{cf.label}</Label>
                              <Input
                                value={toolsConfig[`${tool.key}_${cf.key}`] ?? ""}
                                onChange={e => updateToolConfig(tool.key, cf.key, e.target.value)}
                                placeholder={cf.placeholder}
                                className="text-sm h-8"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TEST ── */}
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
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AgentFormDialog — thin wrapper for backward compat
   ═══════════════════════════════════════════════════════ */
export function AgentFormDialog({ open, onOpenChange, agent, onSave, isSaving }: {
  open: boolean; onOpenChange: (v: boolean) => void; agent?: AiAgent | null;
  onSave: (data: Partial<AiAgentInsert>) => void; isSaving: boolean;
}) {
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
  messages: { role: "user" | "assistant"; text: string; meta?: any }[];
  loading: boolean; input: string; setInput: (v: string) => void;
  onSend: () => void; onClear: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  fullWidth?: boolean;
}) {
  const modelLabel = MODELS.find(m => m.value === model)?.label ?? model;

  return (
    <Card className={cn("overflow-hidden flex flex-col", fullWidth ? "min-h-[450px] max-h-[calc(100vh-200px)]" : "h-[calc(100vh-220px)] max-h-[600px]")}>
      {/* Header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-border/20 bg-muted/10 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Bot className="h-3.5 w-3.5 text-primary" /></div>
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-none truncate">{name || "Agente"}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{modelLabel} · {maxTokens} tok</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-6 text-[9px] text-muted-foreground px-2"><RotateCcw className="h-2.5 w-2.5 mr-1" />Limpar</Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 && !loading && (
          <div className="text-center pt-12 pb-6">
            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-2"><MessageSquare className="h-6 w-6 text-primary/20" /></div>
            <p className="text-xs text-muted-foreground/40 font-medium">Simulador</p>
            <p className="text-[10px] text-muted-foreground/30 mt-0.5">Teste o agente sem enviar WhatsApp</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 mt-1 shrink-0"><Bot className="h-2.5 w-2.5 text-primary" /></div>
              )}
              <div className={cn(
                "max-w-[85%] px-3 py-2 text-[13px] leading-relaxed",
                msg.role === "user" ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md" : "bg-muted/30 rounded-2xl rounded-bl-md"
              )}>{msg.text}</div>
            </div>
            {msg.role === "assistant" && msg.meta && (
              <div className="ml-7 mt-1 flex flex-wrap gap-1">
                {msg.meta.model && <Badge variant="outline" className="text-[8px] px-1 py-0 font-mono">{msg.meta.model}</Badge>}
                {msg.meta.tokens && <Badge variant="outline" className="text-[8px] px-1 py-0 font-mono">{msg.meta.tokens.total_tokens} tok</Badge>}
                {msg.meta.latency_ms && <Badge variant="outline" className="text-[8px] px-1 py-0 font-mono">{msg.meta.latency_ms}ms</Badge>}
                {msg.meta.tool_actions?.map((a: string, j: number) => (
                  <Badge key={j} variant="secondary" className="text-[8px] px-1 py-0 gap-0.5"><Zap className="h-2 w-2" />{a}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 mt-1 shrink-0"><Bot className="h-2.5 w-2.5 text-primary" /></div>
            <div className="bg-muted/30 px-3.5 py-2.5 rounded-2xl rounded-bl-md">
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

      {/* Input — fixed at bottom */}
      <div className="shrink-0 border-t border-border/20 p-2 sm:p-3 flex gap-1.5 bg-background">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Mensagem de teste..." className="text-sm h-8"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} />
        <Button size="icon" onClick={onSend} disabled={loading || !input.trim()} className="shrink-0 h-8 w-8">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </Card>
  );
}
