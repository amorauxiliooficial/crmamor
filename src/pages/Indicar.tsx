import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, Loader2, Instagram } from "lucide-react";
import logoAmor from "@/assets/logo-amor.png";

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm text-center space-y-6 animate-fade-in">
          <img src={logoAmor} alt="Amor Auxílio Maternidade" className="h-16 mx-auto" />
          
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Indicação enviada!</h1>
            <p className="text-sm text-muted-foreground">
              Obrigada! Entraremos em contato em breve.
            </p>
          </div>

          <a
            href="https://www.instagram.com/amorauxiliomaternidade"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Instagram className="h-4 w-4" />
            Siga-nos para garantir +R$100
          </a>

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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="py-6 px-4 flex justify-center border-b">
        <img src={logoAmor} alt="Amor Auxílio Maternidade" className="h-12" />
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-xl font-semibold text-foreground">
              Indique uma Mãe
            </h1>
            <p className="text-sm text-muted-foreground">
              Ganhe até R$200 por indicação aprovada
            </p>
          </div>

          {/* Rewards - Minimal */}
          <div className="flex justify-center gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">R$100</p>
              <p className="text-xs text-muted-foreground">Aprovação INSS</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p className="text-2xl font-bold text-primary">+R$100</p>
              <p className="text-xs text-muted-foreground">Seguindo Instagram</p>
              <a
                href="https://www.instagram.com/amorauxiliomaternidade"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <Instagram className="h-3 w-3" />
                @amorauxiliomaternidade
              </a>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Indicada Section */}
            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pessoa indicada
              </p>
              
              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
                <Label htmlFor="telefone_indicada">WhatsApp</Label>
                <Input
                  id="telefone_indicada"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone_indicada}
                  onChange={(e) => handlePhoneChange("telefone_indicada", e.target.value)}
                  maxLength={16}
                  inputMode="tel"
                />
              </div>
            </div>

            {/* Indicadora Section */}
            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Seus dados
              </p>
              
              <div className="space-y-1.5">
                <Label htmlFor="nome_indicadora">Seu nome</Label>
                <Input
                  id="nome_indicadora"
                  placeholder="Seu nome completo"
                  value={formData.nome_indicadora}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome_indicadora: e.target.value }))}
                  maxLength={200}
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
                "Enviar indicação"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center space-y-3 pt-4 border-t">
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