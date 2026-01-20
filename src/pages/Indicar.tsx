import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, CheckCircle, Loader2, Instagram, ChevronRight } from "lucide-react";
import logoAmor from "@/assets/logo-amor.png";

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
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-pink-50 to-white dark:from-background dark:to-background">
        {/* Header */}
        <header className="w-full py-6 px-4 flex justify-center">
          <img src={logoAmor} alt="Amor Auxílio Maternidade" className="h-16 md:h-20 object-contain" />
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pb-8">
          <Card className="w-full max-w-md text-center shadow-xl border-0">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Obrigada! 💜</h1>
                <p className="text-muted-foreground">
                  Sua indicação foi recebida com sucesso.<br />
                  Entraremos em contato em breve!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-50 to-blue-50 dark:from-primary/10 dark:to-primary/5 border border-pink-100 dark:border-primary/20">
                <p className="text-sm text-muted-foreground mb-3">
                  Siga nosso Instagram para garantir o <strong className="text-foreground">bônus extra de R$ 100</strong>!
                </p>
                <a
                  href="https://www.instagram.com/amorauxiliomaternidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  <Instagram className="h-4 w-4" />
                  @amorauxiliomaternidade
                </a>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSuccess(false);
                  setFormData({ nome_indicada: "", telefone_indicada: "", nome_indicadora: "", telefone_indicadora: "" });
                }}
              >
                Indicar outra pessoa
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-pink-50 to-white dark:from-background dark:to-background">
      {/* Header */}
      <header className="w-full py-6 px-4 flex justify-center">
        <img src={logoAmor} alt="Amor Auxílio Maternidade" className="h-16 md:h-20 object-contain" />
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-8">
        <div className="w-full max-w-lg space-y-6">
          
          {/* Hero Section */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Indique uma Mãe 💜
            </h1>
            <p className="text-muted-foreground">
              Ajude outra mãe a conquistar o salário-maternidade<br className="hidden md:block" /> e ganhe recompensas por isso!
            </p>
          </div>

          {/* Rewards Section - Visual Cards */}
          <div className="grid gap-3">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-green-100 dark:border-green-900/50">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                R$100
              </div>
              <div>
                <p className="font-semibold text-foreground">Indicação Aprovada</p>
                <p className="text-sm text-muted-foreground">Quando a mãe indicada for aprovada pelo INSS</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 border border-pink-100 dark:border-pink-900/50">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white shadow-md">
                <Instagram className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">+ R$ 100 Bônus</p>
                <p className="text-sm text-muted-foreground">
                  Seguindo{" "}
                  <a
                    href="https://www.instagram.com/amorauxiliomaternidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 dark:text-pink-400 hover:underline font-medium"
                  >
                    @amorauxiliomaternidade
                  </a>
                </p>
              </div>
            </div>

            <div className="text-center py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-900/50">
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                ✨ Ganhe até R$ 200 por indicação! ✨
              </p>
            </div>
          </div>

          {/* Form Card */}
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardContent className="p-0">
              <form onSubmit={handleSubmit}>
                {/* Section: Indicada */}
                <div className="p-5 space-y-4 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <span className="font-semibold">Quem você quer indicar?</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="nome_indicada" className="text-sm">Nome completo *</Label>
                      <Input
                        id="nome_indicada"
                        placeholder="Nome da mãe que você está indicando"
                        value={formData.nome_indicada}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome_indicada: e.target.value }))}
                        maxLength={200}
                        required
                        className="h-12 text-base"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="telefone_indicada" className="text-sm">WhatsApp</Label>
                      <Input
                        id="telefone_indicada"
                        placeholder="(00) 00000-0000"
                        value={formData.telefone_indicada}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefone_indicada: e.target.value }))}
                        maxLength={20}
                        className="h-12 text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Indicadora */}
                <div className="p-5 space-y-4 border-t">
                  <div className="flex items-center gap-2 text-pink-700 dark:text-pink-400">
                    <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                    <span className="font-semibold">Seus dados (para receber a recompensa)</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="nome_indicadora" className="text-sm">Seu nome</Label>
                      <Input
                        id="nome_indicadora"
                        placeholder="Seu nome completo"
                        value={formData.nome_indicadora}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome_indicadora: e.target.value }))}
                        maxLength={200}
                        className="h-12 text-base"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="telefone_indicadora" className="text-sm">Seu WhatsApp</Label>
                      <Input
                        id="telefone_indicadora"
                        placeholder="(00) 00000-0000"
                        value={formData.telefone_indicadora}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefone_indicadora: e.target.value }))}
                        maxLength={20}
                        className="h-12 text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="p-5 pt-2 border-t bg-muted/30">
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Enviar Indicação
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Ao enviar, você concorda em compartilhar esses dados<br />
            para que possamos entrar em contato.
          </p>
        </div>
      </main>
    </div>
  );
}