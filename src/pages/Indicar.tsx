import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, Loader2, Instagram, Heart, Gift, UserPlus, Phone, DollarSign } from "lucide-react";
import logoAmor from "@/assets/logo-amor.png";
import confetti from "canvas-confetti";

// Phone mask helper
const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export default function Indicar() {
  const [formData, setFormData] = useState({
    nome_indicada: "",
    telefone_indicada: "",
    nome_indicadora: "",
    telefone_indicadora: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePhoneChange = (field: "telefone_indicada" | "telefone_indicadora", value: string) => {
    setFormData(prev => ({ ...prev, [field]: formatPhone(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_indicada.trim()) {
      toast.error("Por favor, informe o nome da pessoa indicada");
      return;
    }

    // Validate WhatsApp - must have at least 10 digits
    const phoneDigits = formData.telefone_indicada.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      toast.error("Por favor, informe o WhatsApp da pessoa indicada");
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
        // Check if it's a duplicate error - show friendly message
        if (data.duplicate) {
          toast.info("Esta pessoa já foi indicada! 💜", {
            description: "Obrigada pelo carinho, mas ela já está na nossa lista.",
            duration: 5000,
          });
        } else {
          toast.error(data.error);
        }
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

  // Trigger confetti on success
  useEffect(() => {
    if (success) {
      // First burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#f472b6', '#f9a8d4', '#3b82f6', '#60a5fa']
      });
      
      // Second burst after delay
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ec4899', '#f472b6', '#f9a8d4']
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#3b82f6', '#60a5fa', '#93c5fd']
        });
      }, 250);
    }
  }, [success]);

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-8">
        <div className="w-full max-w-md text-center space-y-8 animate-fade-in">
          {/* Logo */}
          <img src={logoAmor} alt="Amor Auxílio Maternidade" className="h-20 mx-auto animate-scale-in" />
          
          {/* Success Icon with animation */}
          <div className="relative">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-pink-100 flex items-center justify-center animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-pink-400 flex items-center justify-center shadow-lg">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
            </div>
            {/* Floating hearts */}
            <Heart className="absolute -top-2 -right-4 h-6 w-6 text-pink-300 animate-pulse" />
            <Heart className="absolute top-8 -left-6 h-4 w-4 text-pink-200 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          {/* Success Message */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">
              🎉 Indicação Enviada!
            </h1>
            <p className="text-muted-foreground">
              Obrigada por indicar! Entraremos em contato com ela em breve.
            </p>
          </div>

          {/* Reward reminder card */}
          <div className="bg-gradient-to-r from-primary/5 to-pink-50 rounded-2xl p-6 space-y-4 border border-primary/10">
            <div className="flex items-center justify-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Suas Recompensas</span>
            </div>
            <div className="flex justify-center gap-4 text-center">
              <div className="bg-white rounded-xl px-4 py-3 shadow-sm">
                <p className="text-xl font-bold text-primary">R$100</p>
                <p className="text-xs text-muted-foreground">Aprovação INSS</p>
              </div>
              <div className="bg-white rounded-xl px-4 py-3 shadow-sm">
                <p className="text-xl font-bold text-primary">+R$100</p>
                <p className="text-xs text-muted-foreground">Seguindo Instagram</p>
              </div>
            </div>
            <a
              href="https://www.instagram.com/amorauxiliomaternidade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium py-3 px-4 rounded-xl hover:opacity-90 transition-opacity"
            >
              <Instagram className="h-5 w-5" />
              Seguir no Instagram
            </a>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full"
              onClick={() => {
                setSuccess(false);
                setFormData({ nome_indicada: "", telefone_indicada: "", nome_indicadora: "", telefone_indicadora: "" });
              }}
            >
              Indicar outra pessoa
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header with white band */}
      <header className="bg-white border-b shadow-sm">
        <div className="py-6 px-4 flex justify-center">
          <img src={logoAmor} alt="Amor Auxílio Maternidade" className="h-14 animate-fade-in" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          
          {/* Hero Section */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-primary">
              Indique uma Mãe
            </h1>
            <p className="text-sm text-foreground/70">
              Ajude outras mães a conquistarem seus direitos
            </p>
          </div>

          {/* How it works */}
          <div className="bg-muted/30 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-center text-foreground">Como funciona?</p>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">1. Indique uma mãe</p>
                <p className="text-xs text-muted-foreground">Preencha os dados dela abaixo</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">2. Entramos em contato</p>
                <p className="text-xs text-muted-foreground">Nossa equipe vai conversar com ela</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">3. Você recebe</p>
                <p className="text-xs text-muted-foreground">R$100 na aprovação + R$100 seguindo nosso Instagram</p>
              </div>
            </div>
          </div>

          {/* Rewards Card */}
          <div className="bg-gradient-to-r from-primary/10 via-pink-50 to-primary/5 rounded-2xl p-5 border border-primary/10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Gift className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Ganhe até R$200!</span>
            </div>
            <div className="flex justify-center gap-4">
              <div className="flex-1 bg-white rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-primary">R$100</p>
                <p className="text-xs text-muted-foreground mt-1">Aprovação INSS</p>
              </div>
              <div className="flex-1 bg-white rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-primary">+R$100</p>
                <p className="text-xs text-muted-foreground mt-1">Seguindo Instagram</p>
                <a
                  href="https://www.instagram.com/amorauxiliomaternidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  <Instagram className="h-3 w-3" />
                  Seguir agora
                </a>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
            {/* Indicada Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  Quem você quer indicar?
                </p>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="nome_indicada">Nome completo *</Label>
                <Input
                  id="nome_indicada"
                  placeholder="Nome da mãe indicada"
                  value={formData.nome_indicada}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome_indicada: e.target.value }))}
                  maxLength={200}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefone_indicada">WhatsApp dela *</Label>
                <Input
                  id="telefone_indicada"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone_indicada}
                  onChange={(e) => handlePhoneChange("telefone_indicada", e.target.value)}
                  maxLength={16}
                  inputMode="tel"
                  required
                  className="h-12"
                />
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Indicadora Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  Seus dados (para receber a recompensa)
                </p>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="nome_indicadora">Seu nome</Label>
                <Input
                  id="nome_indicadora"
                  placeholder="Seu nome completo"
                  value={formData.nome_indicadora}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome_indicadora: e.target.value }))}
                  maxLength={200}
                  className="h-12"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefone_indicadora">Seu WhatsApp</Label>
                <Input
                  id="telefone_indicadora"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone_indicadora}
                  onChange={(e) => handlePhoneChange("telefone_indicadora", e.target.value)}
                  maxLength={16}
                  inputMode="tel"
                  className="h-12"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-5 w-5" />
                  Enviar indicação
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center py-4">
            <a
              href="https://www.instagram.com/amorauxiliomaternidade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Instagram className="h-4 w-4" />
              @amorauxiliomaternidade
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}