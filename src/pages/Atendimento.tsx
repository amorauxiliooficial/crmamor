import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { mockConversas as initialConversas, mockMensagens as initialMensagens, type Conversa, type Mensagem } from "@/data/atendimentoMock";
import { respostasRapidas } from "@/data/respostasRapidas";
import { InboxSidebar } from "@/components/atendimento/InboxSidebar";
import { ChatPanel } from "@/components/atendimento/ChatPanel";
import { CrmContextPanel } from "@/components/atendimento/CrmContextPanel";
import { CommandPalette } from "@/components/atendimento/CommandPalette";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const URGENCY_KEYWORDS = [
  "urgente", "urgência", "cancelar", "problema", "reclamação",
  "advogado", "processo", "prazo", "vencendo", "atraso",
  "não recebi", "cobranç", "desesper",
];

function detectUrgency(text: string): boolean {
  const lower = text.toLowerCase();
  return URGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

type TabFilter = "nao_lidas" | "Aberto" | "Pendente" | "Fechado";

export default function Atendimento() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [conversas, setConversas] = useState<Conversa[]>(() =>
    initialConversas.map((c) => ({
      ...c,
      prioridade: detectUrgency(c.ultimaMensagem) ? "alta" as const : "normal" as const,
      slaMinutos: Math.floor((Date.now() - c.horario.getTime()) / 60000),
    }))
  );
  const [mensagens, setMensagens] = useState<Record<string, Mensagem[]>>(initialMensagens);
  const [selectedId, setSelectedId] = useState<string | null>(routeId ?? null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TabFilter | null>(null);
  const [atendenteFilter, setAtendenteFilter] = useState<"todos" | "meus">("todos");
  const [msgText, setMsgText] = useState("");
  const [showContext, setShowContext] = useState(true);
  const [showContextDrawer, setShowContextDrawer] = useState(false);

  // Check if tablet (between mobile and desktop)
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1280);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (routeId) setSelectedId(routeId);
  }, [routeId]);

  const conversa = selectedId ? conversas.find((c) => c.id === selectedId) ?? null : null;
  const msgs = selectedId ? mensagens[selectedId] ?? [] : [];

  const selectConversa = useCallback(
    (id: string) => {
      setSelectedId(id);
      navigate(`/atendimento/chat/${id}`, { replace: true });
    },
    [navigate]
  );

  const handleAssume = useCallback(
    (id?: string) => {
      const target = id || selectedId;
      if (!target) return;
      setConversas((prev) => prev.map((c) => (c.id === target ? { ...c, atendente: "Você" } : c)));
      toast({ title: "Conversa assumida" });
    },
    [selectedId, toast]
  );

  const handlePendente = useCallback(
    (id?: string) => {
      const target = id || selectedId;
      if (!target) return;
      setConversas((prev) => prev.map((c) => (c.id === target ? { ...c, status: "Pendente" as const } : c)));
    },
    [selectedId]
  );

  const handleFinalizar = useCallback(
    (id?: string) => {
      const target = id || selectedId;
      if (!target) return;
      setConversas((prev) => prev.map((c) => (c.id === target ? { ...c, status: "Fechado" as const } : c)));
      toast({ title: "Atendimento finalizado" });
    },
    [selectedId, toast]
  );

  const toggleEtiqueta = useCallback(
    (etiqueta: string) => {
      if (!selectedId) return;
      setConversas((prev) =>
        prev.map((c) => {
          if (c.id !== selectedId) return c;
          const has = c.etiquetas.includes(etiqueta);
          return { ...c, etiquetas: has ? c.etiquetas.filter((e) => e !== etiqueta) : [...c.etiquetas, etiqueta] };
        })
      );
    },
    [selectedId]
  );

  const handleSend = useCallback(() => {
    if (!selectedId || !msgText.trim()) return;
    const text = msgText.trim();
    const isUrgent = detectUrgency(text);
    const newMsg: Mensagem = { id: `m${Date.now()}`, texto: text, de: "atendente", horario: new Date() };
    setMensagens((prev) => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), newMsg] }));
    setConversas((prev) => prev.map((c) => {
      if (c.id !== selectedId) return c;
      const updated: Conversa = { ...c, ultimaMensagem: newMsg.texto, horario: newMsg.horario, slaMinutos: 0 };
      if (isUrgent && !c.etiquetas.includes("Urgente")) {
        updated.prioridade = "alta";
        updated.etiquetas = [...c.etiquetas, "Urgente"];
      }
      return updated;
    }));
    setMsgText("");
  }, [selectedId, msgText]);

  // Sort conversas: urgent first, then by horario
  const sortedConversas = useMemo(() => {
    return [...conversas].sort((a, b) => {
      if (a.prioridade === "alta" && b.prioridade !== "alta") return -1;
      if (b.prioridade === "alta" && a.prioridade !== "alta") return 1;
      return b.horario.getTime() - a.horario.getTime();
    });
  }, [conversas]);

  if (loading || !user) return null;

  // Mobile: single column
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <CommandPalette
          conversas={conversas}
          respostas={respostasRapidas}
          onSelectConversa={selectConversa}
          onAssumir={() => handleAssume()}
          onPendente={() => handlePendente()}
          onFinalizar={() => handleFinalizar()}
          onFilterPendentes={() => setStatusFilter("Pendente")}
          onFilterSemAtendente={() => setAtendenteFilter("todos")}
          onInsertTemplate={(t) => setMsgText(t)}
        />
        {selectedId ? (
          <ChatPanel
            conversa={conversa}
            mensagens={msgs}
            isMobile
            msgText={msgText}
            onMsgTextChange={setMsgText}
            onSend={handleSend}
            onBack={() => { setSelectedId(null); navigate("/atendimento"); }}
            onAssume={() => handleAssume()}
            onPendente={() => handlePendente()}
            onFinalizar={() => handleFinalizar()}
            onToggleEtiqueta={toggleEtiqueta}
            respostas={respostasRapidas}
          />
        ) : (
          <InboxSidebar
            conversas={sortedConversas}
            selectedId={selectedId}
            search={search}
            onSearchChange={setSearch}
            onSelect={selectConversa}
            onOpenConfig={() => navigate("/atendimento/config")}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            atendenteFilter={atendenteFilter}
            onAtendenteFilterChange={setAtendenteFilter}
            onAssume={handleAssume}
            onPendente={handlePendente}
          />
        )}
      </div>
    );
  }

  // Desktop / Tablet
  return (
    <div className="flex h-screen bg-background">
      <CommandPalette
        conversas={conversas}
        respostas={respostasRapidas}
        onSelectConversa={selectConversa}
        onAssumir={() => handleAssume()}
        onPendente={() => handlePendente()}
        onFinalizar={() => handleFinalizar()}
        onFilterPendentes={() => setStatusFilter("Pendente")}
        onFilterSemAtendente={() => setAtendenteFilter("todos")}
        onInsertTemplate={(t) => setMsgText(t)}
      />

      {/* Inbox */}
      <InboxSidebar
        conversas={sortedConversas}
        selectedId={selectedId}
        search={search}
        onSearchChange={setSearch}
        onSelect={selectConversa}
        onOpenConfig={() => navigate("/atendimento/config")}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        atendenteFilter={atendenteFilter}
        onAtendenteFilterChange={setAtendenteFilter}
        onAssume={handleAssume}
        onPendente={handlePendente}
      />

      {/* Chat */}
      <ChatPanel
        conversa={conversa}
        mensagens={msgs}
        isMobile={false}
        msgText={msgText}
        onMsgTextChange={setMsgText}
        onSend={handleSend}
        onBack={() => {}}
        onAssume={() => handleAssume()}
        onPendente={() => handlePendente()}
        onFinalizar={() => handleFinalizar()}
        onToggleEtiqueta={toggleEtiqueta}
        respostas={respostasRapidas}
        showContext={showContext}
        onToggleContext={() => {
          if (isTablet) {
            setShowContextDrawer(!showContextDrawer);
          } else {
            setShowContext(!showContext);
          }
        }}
      />

      {/* CRM Context - Desktop (inline) */}
      {!isTablet && showContext && (
        <CrmContextPanel conversa={conversa} />
      )}

      {/* CRM Context - Tablet (drawer) */}
      {isTablet && (
        <Sheet open={showContextDrawer} onOpenChange={setShowContextDrawer}>
          <SheetContent side="right" className="p-0 w-[340px]">
            <CrmContextPanel conversa={conversa} className="w-full border-l-0" />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
