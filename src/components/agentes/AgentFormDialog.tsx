import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Loader2, Send, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { AiAgent, AiAgentInsert } from "@/hooks/useAiAgents";

const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (custo-benefício)" },
  { value: "gpt-4o", label: "GPT-4o (forte)" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "gpt-4.1", label: "GPT-4.1" },
];

const TONES = ["amigável e profissional", "formal", "casual", "empático", "direto"];

const DEPARTMENTS = ["Salário-maternidade", "Financeiro", "Suporte", "Vendas", "Geral"];

const TOOLS_OPTIONS = [
  { key: "qualify_lead", label: "Qualificar lead", desc: "Coleta dados para qualificação" },
  { key: "apply_tags", label: "Aplicar etiquetas", desc: "Adiciona tags à conversa" },
  { key: "handoff_human", label: "Transbordo humano", desc: "Transfere para atendente" },
  { key: "register_events", label: "Registrar eventos", desc: "Salva eventos no CRM" },
  { key: "schedule_followup", label: "Agendar follow-up", desc: "Cria lembrete de acompanhamento" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agent?: AiAgent | null;
  onSave: (data: Partial<AiAgentInsert>) => void;
  isSaving: boolean;
}

export function AgentFormDialog({ open, onOpenChange, agent, onSave, isSaving }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState("personality");

  // Form state
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

  // Preview state
  const [previewInput, setPreviewInput] = useState("");
  const [previewOutput, setPreviewOutput] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
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
      setName("");
      setModel("gpt-4o-mini");
      setTone("amigável e profissional");
      setMaxTokens(300);
      setDepartments([]);
      setSystemPrompt("");
      setKnowledgeInstructions("");
      setKnowledgeFaq([]);
      setKnowledgeLinks([]);
      setToolsConfig({});
      setIsActive(true);
    }
    setTab("personality");
    setPreviewInput("");
    setPreviewOutput("");
  }, [agent, open]);

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    onSave({
      name: name.trim(),
      model,
      tone,
      max_tokens: maxTokens,
      departments,
      system_prompt: systemPrompt,
      knowledge_instructions: knowledgeInstructions,
      knowledge_faq: knowledgeFaq,
      knowledge_links: knowledgeLinks.filter(Boolean),
      tools_config: toolsConfig,
      is_active: isActive,
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

  const handlePreview = async () => {
    if (!previewInput.trim()) return;
    setPreviewLoading(true);
    setPreviewOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("wa-ai-reply", {
        body: {
          preview_mode: true,
          preview_message: previewInput.trim(),
          agent_config: {
            name, model, tone, max_tokens: maxTokens,
            system_prompt: systemPrompt,
            knowledge_instructions: knowledgeInstructions,
            knowledge_faq: knowledgeFaq,
          },
        },
      });
      if (error) throw error;
      setPreviewOutput(data?.reply || data?.error || "Sem resposta");
    } catch (err: any) {
      setPreviewOutput(`Erro: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {agent ? "Editar Agente IA" : "Novo Agente IA"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personality">Personalidade</TabsTrigger>
            <TabsTrigger value="knowledge">Conhecimento</TabsTrigger>
            <TabsTrigger value="tools">Ferramentas</TabsTrigger>
            <TabsTrigger value="preview">Teste</TabsTrigger>
          </TabsList>

          {/* ── Personality Tab ── */}
          <TabsContent value="personality" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Agente *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Emily" />
              </div>
              <div className="space-y-2">
                <Label>Modelo IA</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[100]">
                    {MODELS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tom de conversa</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[100]">
                    {TONES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Máx. tokens</Label>
                <Input type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} min={50} max={4000} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Departamentos / Labels</Label>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map(d => (
                  <Badge
                    key={d}
                    variant={departments.includes(d) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDepartment(d)}
                  >
                    {d}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prompt do sistema (personalidade)</Label>
              <Textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="Descreva a personalidade, regras e comportamento do agente..."
                className="min-h-[120px]"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Agente ativo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </TabsContent>

          {/* ── Knowledge Tab ── */}
          <TabsContent value="knowledge" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Instruções de conhecimento</Label>
              <Textarea
                value={knowledgeInstructions}
                onChange={e => setKnowledgeInstructions(e.target.value)}
                placeholder="Instruções gerais sobre o que o agente sabe, como deve responder sobre temas específicos..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Perguntas e Respostas</Label>
                <Button size="sm" variant="outline" onClick={addFaq}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                </Button>
              </div>
              {knowledgeFaq.map((faq, i) => (
                <Card key={i}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={faq.question}
                          onChange={e => updateFaq(i, "question", e.target.value)}
                          placeholder="Pergunta..."
                          className="text-sm"
                        />
                        <Textarea
                          value={faq.answer}
                          onChange={e => updateFaq(i, "answer", e.target.value)}
                          placeholder="Resposta..."
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                      <Button size="icon" variant="ghost" className="shrink-0 text-destructive" onClick={() => removeFaq(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {knowledgeFaq.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma pergunta cadastrada</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Links de consulta (até 5)</Label>
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
          </TabsContent>

          {/* ── Tools Tab ── */}
          <TabsContent value="tools" className="space-y-3 mt-4">
            {TOOLS_OPTIONS.map(tool => (
              <div key={tool.key} className="flex items-center justify-between p-3 rounded-lg border border-border/30">
                <div>
                  <p className="text-sm font-medium">{tool.label}</p>
                  <p className="text-xs text-muted-foreground">{tool.desc}</p>
                </div>
                <Switch
                  checked={toolsConfig[tool.key] ?? false}
                  onCheckedChange={v => setToolsConfig(prev => ({ ...prev, [tool.key]: v }))}
                />
              </div>
            ))}
          </TabsContent>

          {/* ── Preview Tab ── */}
          <TabsContent value="preview" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">Simule uma mensagem para testar a resposta do agente (sem enviar no WhatsApp).</p>
            <div className="flex gap-2">
              <Input
                value={previewInput}
                onChange={e => setPreviewInput(e.target.value)}
                placeholder="Digite uma mensagem de teste..."
                onKeyDown={e => { if (e.key === "Enter") handlePreview(); }}
              />
              <Button onClick={handlePreview} disabled={previewLoading || !previewInput.trim()}>
                {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {previewOutput && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Resposta do agente:</p>
                  <p className="text-sm whitespace-pre-wrap">{previewOutput}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-border/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {agent ? "Salvar" : "Criar Agente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
