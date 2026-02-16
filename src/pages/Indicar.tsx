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

const steps = [
  {
    icon: UserPlus,
    title: "Indique",
    description: "Preencha o formulário com os dados da gestante ou mãe",
  },
  {
    icon: Phone,
    title: "Entramos em contato",
    description: "Nossa equipe entra em contato para verificar a elegibilidade",
  },
  {
    icon: Heart,
    title: "Análise",
    description: "Analisamos o caso e orientamos sobre o benefício",
  },
  {
    icon: DollarSign,
    title: "Benefício",
    description: "Ajudamos no processo para receber o auxílio maternidade",
  },
];

export default function Indicar() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    nome_indicada: "",
    telefone_indicada: "",
    nome_indicadora: "",
    telefone_indicadora: "",
  });

  const handlePhoneChange = (field: "telefone_indicada" | "telefone_indicadora", value: string) => {
    setForm((prev) => ({ ...prev, [field]: formatPhone(value) }));
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ec4899", "#f472b6", "#f9a8d4", "#fce7f3"],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome_indicada.trim()) {
      toast.error("Por favor, informe o nome da pessoa indicada");
      return;
    }

    if (!form.nome_indicadora.trim()) {
      toast.error("Por favor, informe seu nome");
      return;
    }

    const telefoneIndicadoraDigits = form.telefone_indicadora.replace(/\D/g, "");
    if (telefoneIndicadoraDigits.length < 10) {
      toast.error("Por favor, informe seu WhatsApp com DDD");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-indicacao", {
        body: {
          nome_indicada: form.nome_indicada.trim(),
          telefone_indicada: form.telefone_indicada.replace(/\D/g, "") || null,
          nome_indicadora: form.nome_indicadora.trim(),
          telefone_indicadora: form.telefone_indicadora.replace(/\D/g, ""),
        },
      });

      if (error) throw error;

      if (data?.duplicate) {
        toast.error(data.error || "Esta pessoa já foi indicada anteriormente.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setSuccess(true);
      fireConfetti();
    } catch (err: any) {
      console.error("Error submitting indication:", err);
      
      // Try to parse error body for duplicate detection
      try {
        const errorBody = JSON.parse(err?.message || "{}");
        if (errorBody?.duplicate) {
          toast.error(errorBody.error || "Esta pessoa já foi indicada anteriormente.");
          return;
        }
      } catch {}
      
      toast.error("Erro ao enviar indicação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 to-rose-50">
        <div className="max-w-md w-full text-center space-y-6">
          <img src={logoAmor} alt="Amor Auxílio Maternidade" className="h-20 mx-auto" />
          <div className="space-y-3">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Indicação Enviada!</h2>
            <p className="text-muted-foreground">
              Obrigada por indicar! Nossa equipe entrará em contato em breve para dar seguimento.
            </p>
          </div>
          <Button
            onClick={() => {
              setSuccess(false);
              setForm({
                nome_indicada: "",
                telefone_indicada: "",
                nome_indicadora: "",
                telefone_indicadora: "",
              });
            }}
            variant="outline"
            className="w-full"
          >
            Fazer nova indicação
          </Button>
          <a
            href="https://www.instagram.com/amorauxiliomaternidade"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Instagram className="h-4 w-4" />
            Siga-nos no Instagram
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50">
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <img src={logoAmor} alt="Amor Auxílio Maternidade" className="h-16 mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Indique uma Gestante ou Mãe</h1>
            <p className="text-muted-foreground mt-1">
              Ajude alguém a receber o auxílio maternidade que merece
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={i} className="text-center space-y-2 p-3 rounded-lg bg-background/80 border">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 bg-background rounded-xl border p-6 shadow-sm">
          {/* Dados da indicada */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Dados da pessoa indicada
            </h3>
            <div className="space-y-2">
              <Label htmlFor="nome_indicada">Nome completo *</Label>
              <Input
                id="nome_indicada"
                placeholder="Nome da gestante ou mãe"
                value={form.nome_indicada}
                onChange={(e) => setForm((prev) => ({ ...prev, nome_indicada: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone_indicada">Telefone / WhatsApp</Label>
              <Input
                id="telefone_indicada"
                placeholder="(00) 00000-0000"
                value={form.telefone_indicada}
                onChange={(e) => handlePhoneChange("telefone_indicada", e.target.value)}
              />
            </div>
          </div>

          {/* Dados da indicadora */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Seus dados (quem indica)
            </h3>
            <div className="space-y-2">
              <Label htmlFor="nome_indicadora">Seu nome *</Label>
              <Input
                id="nome_indicadora"
                placeholder="Seu nome completo"
                value={form.nome_indicadora}
                onChange={(e) => setForm((prev) => ({ ...prev, nome_indicadora: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone_indicadora">Seu WhatsApp *</Label>
              <Input
                id="telefone_indicadora"
                placeholder="(00) 00000-0000"
                value={form.telefone_indicadora}
                onChange={(e) => handlePhoneChange("telefone_indicadora", e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Enviar Indicação
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center">
          <a
            href="https://www.instagram.com/amorauxiliomaternidade"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Instagram className="h-4 w-4" />
            @amorauxiliomaternidade
          </a>
        </div>
      </div>
    </div>
  );
}
