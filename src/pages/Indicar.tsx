import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, CheckCircle, Loader2 } from "lucide-react";

export default function Indicar() {
  const [formData, setFormData] = useState({
    nome_indicada: "",
    telefone_indicada: "",
    nome_indicadora: "",
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
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => {
                setSuccess(false);
                setFormData({ nome_indicada: "", telefone_indicada: "", nome_indicadora: "" });
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
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
            <div className="space-y-2">
              <Label htmlFor="nome_indicada">Nome da pessoa indicada *</Label>
              <Input
                id="nome_indicada"
                placeholder="Nome completo"
                value={formData.nome_indicada}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_indicada: e.target.value }))}
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone_indicada">Telefone da pessoa indicada</Label>
              <Input
                id="telefone_indicada"
                placeholder="(00) 00000-0000"
                value={formData.telefone_indicada}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone_indicada: e.target.value }))}
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome_indicadora">Seu nome (quem está indicando)</Label>
              <Input
                id="nome_indicadora"
                placeholder="Seu nome"
                value={formData.nome_indicadora}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_indicadora: e.target.value }))}
                maxLength={200}
              />
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
  );
}