import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const atendentesMock = [
  { nome: "Maria Souza", ativo: true },
  { nome: "João Pereira", ativo: true },
  { nome: "Ana Costa", ativo: false },
];

export default function AtendimentoConfig() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/atendimento")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-base">Configurações do Atendimento</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Conexão WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conexão WhatsApp</CardTitle>
            <CardDescription>Gerencie a conexão com o WhatsApp Business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-chart-1" />
              <span className="text-sm font-medium">Conectado</span>
              <Badge variant="outline" className="ml-auto">
                <Wifi className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Desconectar</Button>
              <Button variant="outline" size="sm">Ver QR Code</Button>
            </div>
          </CardContent>
        </Card>

        {/* Regras de Atendimento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Regras de Atendimento</CardTitle>
            <CardDescription>Configure horários e mensagens automáticas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário de início</Label>
                <Input type="time" defaultValue="08:00" />
              </div>
              <div className="space-y-2">
                <Label>Horário de fim</Label>
                <Input type="time" defaultValue="18:00" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mensagem de fora do horário</Label>
              <Textarea
                defaultValue="Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve!"
                className="min-h-[80px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Mensagem de boas-vindas</Label>
              <Textarea
                defaultValue="Olá! Seja bem-vindo(a) ao nosso atendimento. Como podemos ajudar?"
                className="min-h-[80px] text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Atendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atendentes</CardTitle>
            <CardDescription>Gerencie os atendentes do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {atendentesMock.map((a, i) => (
              <div key={i}>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">{a.nome}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {a.ativo ? "Ativo" : "Inativo"}
                    </span>
                    <Switch defaultChecked={a.ativo} />
                  </div>
                </div>
                {i < atendentesMock.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Button className="w-full" size="lg">
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}
