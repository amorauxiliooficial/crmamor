import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Bot, ChevronRight, MessageSquareText, Globe, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useChannels, useUpdateChannel } from "@/hooks/useChannels";

const initialAtendentes = [
  { nome: "Maria Silva", email: "maria@aam.com", ativo: true },
  { nome: "João Santos", email: "joao@aam.com", ativo: true },
  { nome: "Ana Lima", email: "ana@aam.com", ativo: false },
];

export default function AtendimentoConfig() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [foraHorarioAtivo, setForaHorarioAtivo] = useState(true);
  const [boasVindasAtivo, setBoasVindasAtivo] = useState(true);
  const [atendentes, setAtendentes] = useState(initialAtendentes);

  if (loading) return null;
  if (!user) { navigate("/auth"); return null; }

  function toggleAtendente(idx: number) {
    setAtendentes(prev => prev.map((a, i) => i === idx ? { ...a, ativo: !a.ativo } : a));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/atendimento")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-base">Configurações de Atendimento</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Conexão WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conexão WhatsApp</CardTitle>
            <CardDescription>Status da integração com WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
              <span className="text-sm font-medium">Conectado</span>
              <span className="text-sm text-muted-foreground ml-2">+55 (11) 99999-0000</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Ver QR Code</Button>
              <Button variant="destructive" size="sm">Desconectar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Horário de Atendimento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Horário de Atendimento</CardTitle>
            <CardDescription>Configure horário e mensagem automática</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Ativar mensagem fora do horário</Label>
              <Switch checked={foraHorarioAtivo} onCheckedChange={setForaHorarioAtivo} />
            </div>
            {foraHorarioAtivo && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input type="time" defaultValue="08:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input type="time" defaultValue="18:00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mensagem fora do horário</Label>
                  <Textarea
                    defaultValue="Nosso horário de atendimento é de segunda a sexta, das 8h às 18h. Retornaremos em breve!"
                    className="min-h-[80px] text-sm"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Boas-vindas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mensagem de Boas-vindas</CardTitle>
            <CardDescription>Mensagem automática ao iniciar conversa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Ativar boas-vindas</Label>
              <Switch checked={boasVindasAtivo} onCheckedChange={setBoasVindasAtivo} />
            </div>
            {boasVindasAtivo && (
              <Textarea
                defaultValue="Olá! Seja bem-vindo. Em breve um atendente irá te atender. 😊"
                className="min-h-[80px] text-sm"
              />
            )}
          </CardContent>
        </Card>

        {/* Atendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atendentes</CardTitle>
            <CardDescription>Gerencie os atendentes do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {atendentes.map((a, i) => (
              <div key={i}>
                <div className="flex items-center gap-3 py-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-sm">{a.nome.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.nome}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </div>
                  <Switch checked={a.ativo} onCheckedChange={() => toggleAtendente(i)} />
                </div>
                {i < atendentes.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Templates WhatsApp */}
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/atendimento/templates")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquareText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Templates WhatsApp</p>
              <p className="text-xs text-muted-foreground">Gerencie templates aprovados para retomar conversas</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        {/* Agentes IA */}
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/atendimento/agentes-ia")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Agentes IA</p>
              <p className="text-xs text-muted-foreground">Configure agentes de resposta automática por IA</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={() => toast({ title: "Configurações salvas com sucesso!" })}
        >
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}
