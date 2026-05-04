import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquareOff, ArrowLeft } from "lucide-react";

export default function AtendimentoDisabled() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <MessageSquareOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold">Atendimento temporariamente desativado</h1>
        <p className="text-muted-foreground">
          O módulo de chat está pausado no momento. Em breve estará disponível novamente.
        </p>
        <Button onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Button>
      </div>
    </div>
  );
}
