import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MaeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO"
];

export function MaeFormDialog({ open, onOpenChange, onSuccess }: MaeFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome_mae: "",
    cpf: "",
    telefone: "",
    email: "",
    tipo_evento: "Parto" as "Parto" | "Adoção" | "Guarda judicial",
    data_evento: "",
    data_evento_tipo: "" as "" | "Parto (real)" | "DPP",
    categoria_previdenciaria: "Não informado" as "CLT" | "MEI" | "Contribuinte Individual" | "Desempregada" | "Não informado",
    contrato_assinado: false,
    uf: "",
    origem: "",
    observacoes: "",
  });

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa estar logado para cadastrar.",
      });
      return;
    }

    if (!formData.nome_mae.trim() || !formData.cpf.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome e CPF são obrigatórios.",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.from("mae_processo").insert({
      user_id: user.id,
      nome_mae: formData.nome_mae.trim(),
      cpf: formData.cpf.replace(/\D/g, ""),
      telefone: formData.telefone || null,
      email: formData.email || null,
      tipo_evento: formData.tipo_evento,
      data_evento: formData.data_evento || null,
      data_evento_tipo: formData.data_evento_tipo || "",
      categoria_previdenciaria: formData.categoria_previdenciaria,
      contrato_assinado: formData.contrato_assinado,
      uf: formData.uf || null,
      origem: formData.origem || null,
      observacoes: formData.observacoes || null,
    });

    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: error.message,
      });
    } else {
      toast({
        title: "Sucesso!",
        description: "Processo cadastrado com sucesso.",
      });
      // Reset form
      setFormData({
        nome_mae: "",
        cpf: "",
        telefone: "",
        email: "",
        tipo_evento: "Parto",
        data_evento: "",
        data_evento_tipo: "",
        categoria_previdenciaria: "Não informado",
        contrato_assinado: false,
        uf: "",
        origem: "",
        observacoes: "",
      });
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Cadastrar Nova Mãe
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_mae">Nome da Mãe *</Label>
                <Input
                  id="nome_mae"
                  value={formData.nome_mae}
                  onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                  placeholder="000.000.000-00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Select
                  value={formData.uf}
                  onValueChange={(value) => setFormData({ ...formData, uf: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_OPTIONS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="origem">Origem</Label>
                <Input
                  id="origem"
                  value={formData.origem}
                  onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                  placeholder="Como chegou até nós"
                />
              </div>
            </div>
          </div>

          {/* Dados do Evento */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dados do Evento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
                <Select
                  value={formData.tipo_evento}
                  onValueChange={(value: "Parto" | "Adoção" | "Guarda judicial") => 
                    setFormData({ ...formData, tipo_evento: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Parto">Parto</SelectItem>
                    <SelectItem value="Adoção">Adoção</SelectItem>
                    <SelectItem value="Guarda judicial">Guarda judicial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_evento">Data do Evento</Label>
                <Input
                  id="data_evento"
                  type="date"
                  value={formData.data_evento}
                  onChange={(e) => setFormData({ ...formData, data_evento: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo da Data</Label>
                <Select
                  value={formData.data_evento_tipo}
                  onValueChange={(value: "" | "Parto (real)" | "DPP") => 
                    setFormData({ ...formData, data_evento_tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não informado</SelectItem>
                    <SelectItem value="Parto (real)">Parto (real)</SelectItem>
                    <SelectItem value="DPP">DPP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria Previdenciária</Label>
                <Select
                  value={formData.categoria_previdenciaria}
                  onValueChange={(value: "CLT" | "MEI" | "Contribuinte Individual" | "Desempregada" | "Não informado") => 
                    setFormData({ ...formData, categoria_previdenciaria: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="MEI">MEI</SelectItem>
                    <SelectItem value="Contribuinte Individual">Contribuinte Individual</SelectItem>
                    <SelectItem value="Desempregada">Desempregada</SelectItem>
                    <SelectItem value="Não informado">Não informado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contrato */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="contrato_assinado" className="font-medium">Contrato Assinado</Label>
              <p className="text-sm text-muted-foreground">A cliente já assinou o contrato?</p>
            </div>
            <Switch
              id="contrato_assinado"
              checked={formData.contrato_assinado}
              onCheckedChange={(checked) => setFormData({ ...formData, contrato_assinado: checked })}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Anotações adicionais sobre o processo..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cadastrar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
