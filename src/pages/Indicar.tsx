import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, CheckCircle, Loader2, Gift, Instagram, DollarSign, Sparkles } from "lucide-react";

export default function Indicar() {
  const [formData, setFormData] = useState({
    nome_indicada: "",
    telefone_indicada: "",
    nome_indicadora: "",
    telefone_indicadora: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_indicada.trim()) {
      toast.error("Por favor, informe o nome da pessoa indicada");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('public-indicacao', {
        body: {
          nome_indicada: formData.nome_indicada.trim(),
          telefone_indicada: formData.telefone_indicada.trim(),
          nome_indicadora: formData.nome_indicadora.trim(),
          telefone_indicadora: formData.telefone_indicadora.trim(),
        }
      });

      if (error) {
        console.error('Error submitting indication:', error);
        toast.error("Erro ao enviar indicação. Tente novamente.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setSuccess(true);
      toast.success("Indicação enviada com sucesso!");
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erro ao enviar indicação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Obrigada! 💜</CardTitle>
            <CardDescription className="text-base">
              Sua indicação foi recebida com sucesso. Entraremos em contato em breve!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                Lembre-se de seguir nosso Instagram para garantir o bônus extra de <strong>R$ 100</strong>!
              </p>
              <a
                href="https://www.instagram.com/amorauxiliomaternidade"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 text-primary hover:underline font-medium"
              >
                <Instagram className="h-4 w-4" />
                @amorauxiliomaternidade
              </a>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setSuccess(false);
                setFormData({ nome_indicada: "", telefone_indicada: "", nome_indicadora: "", telefone_indicadora: "" });
              }}
            >
              Indicar outra pessoa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 py-8">
      <div className="w-full max-w-md space-y-4">
        {/* Rewards Info Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader className="pb-3 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">🎁 Recompensas por Indicação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/80">
              <DollarSign className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">R$ 100</p>
                <p className="text-sm text-muted-foreground">Quando a mãe indicada for aprovada pelo INSS</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/80">
              <Instagram className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">+ R$ 100 extras</p>
                <p className="text-sm text-muted-foreground">
                  Se você seguir nosso Instagram{" "}
                  <a
                    href="https://www.instagram.com/amorauxiliomaternidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    @amorauxiliomaternidade
                  </a>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="font-semibold text-primary">Total de até R$ 200 por indicação!</p>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Indique uma Mãe</CardTitle>
            <CardDescription className="text-base">
              Conhece alguma mãe que pode precisar de ajuda com o salário-maternidade? 
              Preencha o formulário abaixo!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
                <p className="text-sm font-medium text-muted-foreground">Dados da pessoa indicada</p>
                <div className="space-y-2">
                  <Label htmlFor="nome_indicada">Nome completo *</Label>
                  <Input
                    id="nome_indicada"
                    placeholder="Nome da mãe indicada"
                    value={formData.nome_indicada}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_indicada: e.target.value }))}
                    maxLength={200}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone_indicada">Telefone / WhatsApp</Label>
                  <Input
                    id="telefone_indicada"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone_indicada}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone_indicada: e.target.value }))}
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
                <p className="text-sm font-medium text-muted-foreground">Seus dados (quem está indicando)</p>
                <div className="space-y-2">
                  <Label htmlFor="nome_indicadora">Seu nome</Label>
                  <Input
                    id="nome_indicadora"
                    placeholder="Seu nome completo"
                    value={formData.nome_indicadora}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_indicadora: e.target.value }))}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone_indicadora">Seu telefone / WhatsApp</Label>
                  <Input
                    id="telefone_indicadora"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone_indicadora}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone_indicadora: e.target.value }))}
                    maxLength={20}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Heart className="mr-2 h-4 w-4" />
                    Enviar Indicação
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}