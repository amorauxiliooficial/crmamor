import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InboxSidebar } from "@/components/atendimento/InboxSidebar";
import { ChatPanel } from "@/components/atendimento/ChatPanel";
import { conversasMock, mensagensMock } from "@/data/atendimentoMock";
import logoAam from "@/assets/logo-aam.png";

export default function Atendimento() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (loading) return null;
  if (!user) {
    navigate("/auth");
    return null;
  }

  const selectedConversa = selectedId
    ? conversasMock.find((c) => c.id === selectedId) ?? null
    : null;
  const mensagens = selectedId ? mensagensMock[selectedId] ?? [] : [];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <img src={logoAam} alt="Logo" className="h-9 w-9 object-contain cursor-pointer" onClick={() => navigate("/")} />
          <h1 className="font-semibold text-base">Atendimento</h1>
        </div>
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/atendimento/config")}>
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Configurações</span>
        </Button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        <InboxSidebar
          conversas={conversasMock}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <ChatPanel conversa={selectedConversa} mensagens={mensagens} />
      </div>
    </div>
  );
}
