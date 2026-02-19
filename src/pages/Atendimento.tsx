import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Search, MessageSquare, UserCheck, Clock, CheckCircle,
  Tag, Send, ArrowLeft, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { mockConversas as initialConversas, mockMensagens as initialMensagens, type Conversa, type Mensagem } from "@/data/atendimentoMock";

const STATUS_COLORS: Record<string, string> = {
  Aberto: "bg-green-500",
  Pendente: "bg-yellow-500",
  Fechado: "bg-muted-foreground",
};

const ETIQUETAS_OPTIONS = ["Suporte", "Financeiro", "Reclamação", "Venda", "Urgente"];

function formatHorario(d: Date) {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return "Ontem";
}

function slaColor(d: Date) {
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 10) return "text-green-500";
  if (diffMin <= 30) return "text-yellow-500";
  return "text-destructive";
}

export default function Atendimento() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [conversas, setConversas] = useState<Conversa[]>(initialConversas);
  const [mensagens, setMensagens] = useState<Record<string, Mensagem[]>>(initialMensagens);
  const [selectedId, setSelectedId] = useState<string | null>(routeId ?? null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [atendenteFilter, setAtendenteFilter] = useState<"todos" | "meus">("todos");
  const [msgText, setMsgText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (routeId) setSelectedId(routeId);
  }, [routeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, mensagens]);

  const conversa = selectedId ? conversas.find(c => c.id === selectedId) ?? null : null;
  const msgs = selectedId ? mensagens[selectedId] ?? [] : [];

  const filtered = useMemo(() => {
    return conversas.filter(c => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (atendenteFilter === "meus" && c.atendente !== "Você") return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(c.nome?.toLowerCase().includes(s) || c.telefone.includes(s))) return false;
      }
      return true;
    });
  }, [conversas, statusFilter, atendenteFilter, search]);

  if (loading) return null;
  if (!user) return null;

  function selectConversa(id: string) {
    setSelectedId(id);
    navigate(`/atendimento/chat/${id}`, { replace: true });
  }

  function handleAssume() {
    if (!selectedId) return;
    setConversas(prev => prev.map(c => c.id === selectedId ? { ...c, atendente: "Você" } : c));
    toast({ title: "Conversa assumida" });
  }
  function handlePendente() {
    if (!selectedId) return;
    setConversas(prev => prev.map(c => c.id === selectedId ? { ...c, status: "Pendente" as const } : c));
  }
  function handleFinalizar() {
    if (!selectedId) return;
    setConversas(prev => prev.map(c => c.id === selectedId ? { ...c, status: "Fechado" as const } : c));
    toast({ title: "Atendimento finalizado" });
  }
  function toggleEtiqueta(etiqueta: string) {
    if (!selectedId) return;
    setConversas(prev => prev.map(c => {
      if (c.id !== selectedId) return c;
      const has = c.etiquetas.includes(etiqueta);
      return { ...c, etiquetas: has ? c.etiquetas.filter(e => e !== etiqueta) : [...c.etiquetas, etiqueta] };
    }));
  }
  function handleSend() {
    if (!selectedId || !msgText.trim()) return;
    const newMsg: Mensagem = { id: `m${Date.now()}`, texto: msgText.trim(), de: "atendente", horario: new Date() };
    setMensagens(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), newMsg] }));
    setConversas(prev => prev.map(c => c.id === selectedId ? { ...c, ultimaMensagem: newMsg.texto, horario: newMsg.horario } : c));
    setMsgText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // --- INBOX ---
  const inbox = (
    <div className="w-full md:w-[340px] shrink-0 border-r border-border flex flex-col h-screen bg-card">
      {/* top */}
      <div className="p-3 space-y-2 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-lg">Atendimento</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/atendimento/config")}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-1">
          {(["Aberto", "Pendente", "Fechado"] as const).map(s => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              className={cn("flex-1 h-7 text-xs rounded-full", statusFilter === s && s === "Aberto" && "bg-green-600 hover:bg-green-700 text-primary-foreground", statusFilter === s && s === "Pendente" && "bg-yellow-500 hover:bg-yellow-600 text-primary-foreground", statusFilter === s && s === "Fechado" && "bg-muted-foreground hover:bg-muted-foreground/80 text-primary-foreground")}
              onClick={() => setStatusFilter(prev => prev === s ? null : s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["todos", "meus"] as const).map(f => (
            <Button key={f} size="sm" variant={atendenteFilter === f ? "secondary" : "ghost"} className="flex-1 h-7 text-xs" onClick={() => setAtendenteFilter(f)}>
              {f === "todos" ? "Todos" : "Meus"}
            </Button>
          ))}
        </div>
      </div>

      {/* list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa</p>
        ) : filtered.map(c => (
          <div
            key={c.id}
            className={cn("flex items-start gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors border-b border-border", selectedId === c.id && "bg-accent border-l-2 border-l-primary")}
            onClick={() => selectConversa(c.id)}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="text-sm font-medium">
                {c.nome ? c.nome.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm truncate">{c.nome ?? c.telefone}</span>
                <span className={cn("text-xs shrink-0 ml-2", slaColor(c.horario))}>{formatHorario(c.horario)}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{c.ultimaMensagem}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_COLORS[c.status])} />
                <span className="text-[11px] text-muted-foreground">{c.status}</span>
                <span className="text-[11px] mx-0.5">·</span>
                <span className={cn("text-[11px]", c.atendente ? "text-muted-foreground" : "text-destructive")}>
                  {c.atendente ?? "Sem atendente"}
                </span>
              </div>
            </div>
            {c.naoLidas > 0 && (
              <Badge className="bg-destructive text-destructive-foreground h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] shrink-0">
                {c.naoLidas}
              </Badge>
            )}
          </div>
        ))}
      </ScrollArea>
    </div>
  );

  // --- CHAT ---
  const chat = conversa ? (
    <div className="flex-1 flex flex-col h-screen min-w-0">
      {/* header */}
      <div className="border-b border-border p-3 flex items-center gap-3 shrink-0 flex-wrap">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => { setSelectedId(null); navigate("/atendimento"); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="text-sm">{conversa.nome ? conversa.nome.charAt(0) : <User className="h-4 w-4" />}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{conversa.nome ?? conversa.telefone}</p>
          {conversa.nome && <p className="text-xs text-muted-foreground">{conversa.telefone}</p>}
        </div>
        <Badge variant="outline" className="text-[11px] shrink-0">
          <span className={cn("h-2 w-2 rounded-full mr-1", STATUS_COLORS[conversa.status])} />
          {conversa.status}
        </Badge>
        <div className="ml-auto flex gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleAssume}>
            <UserCheck className="h-4 w-4 text-blue-500" /> Assumir
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handlePendente}>
            <Clock className="h-4 w-4 text-yellow-500" /> Pendente
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleFinalizar}>
            <CheckCircle className="h-4 w-4 text-green-500" /> Finalizar
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Tag className="h-4 w-4 text-purple-500" /> Etiqueta
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              {ETIQUETAS_OPTIONS.map(e => (
                <label key={e} className="flex items-center gap-2 py-1.5 px-2 hover:bg-accent rounded cursor-pointer text-sm">
                  <Checkbox checked={conversa.etiquetas.includes(e)} onCheckedChange={() => toggleEtiqueta(e)} />
                  {e}
                </label>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3 max-w-3xl mx-auto">
          {msgs.map(m => (
            <div key={m.id} className={cn("flex", m.de === "atendente" ? "justify-end" : "justify-start")}>
              <div className={cn("rounded-lg px-3 py-2 max-w-[70%]", m.de === "atendente" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                <p className="text-sm whitespace-pre-wrap">{m.texto}</p>
                <p className={cn("text-[10px] mt-1", m.de === "atendente" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {m.horario.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* footer */}
      <div className="border-t border-border p-3 flex gap-2 shrink-0">
        <Textarea
          ref={textareaRef}
          placeholder="Digite uma mensagem..."
          value={msgText}
          onChange={e => { setMsgText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px"; }}
          onKeyDown={handleKeyDown}
          className="min-h-[40px] max-h-[80px] resize-none text-sm flex-1"
          rows={1}
        />
        <Button size="icon" onClick={handleSend} disabled={!msgText.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 h-screen">
      <MessageSquare className="h-16 w-16 opacity-30" />
      <p className="text-lg font-medium">Selecione uma conversa</p>
      <p className="text-sm">Escolha uma conversa à esquerda para começar</p>
    </div>
  );

  // --- RENDER ---
  if (isMobile) {
    return selectedId ? chat : inbox;
  }

  return (
    <div className="flex h-screen bg-background">
      {inbox}
      {chat}
    </div>
  );
}
